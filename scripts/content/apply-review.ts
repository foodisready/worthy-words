// Applies a reviewer's verdicts from the app's 審稿 Review page.
//
// Entries marked ✓ get `reviewed: true`, but only if the entry still matches
// what the reviewer saw (same fingerprint). ✎ and ? entries are listed with
// their comments, for a person to act on; nothing else is changed.
//
// Usage: npm run content:apply-review -- <file>   (exported .json, or pasted text)
//        npm run content:apply-review -- --dry-run <file>
//        pbpaste | npm run content:apply-review
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMap, isSeq, parseDocument, type YAMLMap } from 'yaml';
import {
  VERDICT_MARK,
  fingerprint,
  parseReview,
  type ReviewEntry,
} from '../../src/app/data/review.ts';
import { LESSONS_DIR, formatProblems, loadContent } from './load.ts';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const path = args.find((a) => !a.startsWith('--'));
const input = readFileSync(path ?? 0, 'utf8');

let entries: ReviewEntry[];
try {
  entries = parseReview(input);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}

const { content, problems } = loadContent();
if (problems.length > 0) {
  console.error(`Content has problems; fix them first:\n${formatProblems(problems)}`);
  process.exit(1);
}

const where = new Map<string, { file: string; fp: string; reviewed: boolean }>();
for (const lesson of content.lessons) {
  for (const p of lesson.proverbs) {
    where.set(p.id, {
      file: lesson.file,
      reviewed: p.reviewed,
      fp: fingerprint({
        ...p,
        text_simp: p.text_simp ?? '',
        pinyin: p.pinyin ?? '',
        jyutping: p.jyutping ?? '',
      }),
    });
  }
}

const approve = new Map<string, string[]>(); // file -> ids
const stale: ReviewEntry[] = [];
const unknown: ReviewEntry[] = [];
const already: string[] = [];
const toDo: ReviewEntry[] = [];

for (const e of entries) {
  const entry = where.get(e.proverb_id);
  if (!entry) unknown.push(e);
  else if (entry.fp !== e.fingerprint) stale.push(e);
  else if (e.verdict !== 'ok') toDo.push(e);
  else if (entry.reviewed) already.push(e.proverb_id);
  else approve.set(entry.file, [...(approve.get(entry.file) ?? []), e.proverb_id]);
}

let marked = 0;
for (const [file, ids] of approve) {
  const filePath = join(LESSONS_DIR, file);
  const doc = parseDocument(readFileSync(filePath, 'utf8'));
  const proverbs = doc.get('proverbs');
  if (!isSeq(proverbs)) continue;
  for (const item of proverbs.items) {
    if (!isMap(item)) continue;
    const entry = item as YAMLMap<string, unknown>;
    if (ids.includes(String(entry.get('id')))) {
      entry.set('reviewed', true);
      marked += 1;
    }
  }
  if (!dryRun)
    writeFileSync(filePath, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
}

const ids = (list: { proverb_id: string }[]) => list.map((e) => e.proverb_id).join(', ');
console.log(
  `${dryRun ? 'Would mark' : 'Marked'} ${marked} entr${marked === 1 ? 'y' : 'ies'} reviewed` +
    (marked ? `: ${[...approve.values()].flat().join(', ')}` : '.'),
);
if (already.length) console.log(`Already reviewed: ${already.join(', ')}`);
if (stale.length) {
  console.log(`\nChanged since the reviewer saw them (review again): ${ids(stale)}`);
}
if (unknown.length) console.log(`\nNot in the content: ${ids(unknown)}`);
if (toDo.length) {
  console.log(`\nTo act on (${toDo.length}):`);
  for (const e of toDo) {
    console.log(`\n${VERDICT_MARK[e.verdict]} ${e.proverb_id} (${where.get(e.proverb_id)!.file})`);
    console.log(e.comment ? e.comment.replace(/^/gm, '  ') : '  (no comment)');
  }
}
