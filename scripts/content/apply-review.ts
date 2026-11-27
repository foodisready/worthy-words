// Combines reviewers' verdicts from the app's 審稿 Review page and marks entries
// reviewed.
//
// Verdict files and pasted text are kept in content/review/inbox/ (not in git:
// it holds names and comments). Each run adds the files given, then looks at
// every reviewer's latest verdict on each entry, counting only verdicts on the
// entry as it is now (same fingerprint). An entry is approved when:
//   - the owner (the editor) marked it ✓, and
//   - at least --need other reviewers marked it ✓ (default 1), and
//   - at least --mandarin of those checked Mandarin (focus "mandarin" or
//     "both"; default 1), and
//   - nobody marked it ✎ Change.
// Approved entries get `reviewed: true` and `reviewed_by:` crediting everyone
// who gave a verdict on the entry, on any version: finding a mistake counts as
// much as approving the fix. Everything else is listed for a person to act on.
//
// Usage:
//   npm run content:apply-review -- --owner <reviewer id>   (once: whose ✓ is required)
//   npm run content:apply-review -- [--dry-run] [--need N] [--mandarin N] [files...]
//   pbpaste | npm run content:apply-review -- -               (add pasted text)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { isMap, isSeq, parseDocument, type YAMLMap } from 'yaml';
import {
  REVIEWER_ID,
  VERDICT_MARK,
  fingerprint,
  parseReview,
  type ReviewEntry,
  type Reviewer,
  type Submission,
} from '../../src/app/data/review.ts';
import { CONTENT_DIR, LESSONS_DIR, formatProblems, loadContent } from './load.ts';

const INBOX = process.env['REVIEW_INBOX'] ?? join(CONTENT_DIR, 'review', 'inbox');
const OWNER_FILE = join(INBOX, 'owner.txt');

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const ownerArg = flag('--owner');
const need = Number(flag('--need') ?? 1);
const needMandarin = Number(flag('--mandarin') ?? 1);
const dryRun = args.includes('--dry-run');
const files = args.filter((a) => a !== '--dry-run');

mkdirSync(INBOX, { recursive: true });
if (ownerArg) {
  writeFileSync(OWNER_FILE, ownerArg.trim() + '\n');
  console.log(`Owner set to reviewer ${ownerArg.trim()}.`);
}

/** Reads a submission; pasted text has no times, so the time it arrived stands in. */
function read(file: string): Submission {
  let submission: Submission;
  try {
    submission = parseReview(readFileSync(file === '-' ? 0 : file, 'utf8'));
  } catch (e) {
    console.error(`${file}: ${(e as Error).message}`);
    process.exit(1);
  }
  if (!submission.reviewer) {
    console.error(`${file}: no reviewer named. Ask them to add their name on the review page.`);
    process.exit(1);
  }
  const now = new Date().toISOString();
  submission.entries = submission.entries.map((e) => ({ ...e, updated_at: e.updated_at || now }));
  return submission;
}

// 1. Read the inbox, then the new submissions (saved to the inbox unless --dry-run).
const submissions: Submission[] = readdirSync(INBOX)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(INBOX, f), 'utf8')) as Submission);
for (const file of files) {
  const s = read(file);
  submissions.push(s);
  if (!dryRun) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const id = s.reviewer!.id;
    const target = resolve(INBOX, `${stamp}-${id}.json`);
    if (!REVIEWER_ID.test(id) || !target.startsWith(resolve(INBOX) + sep)) {
      console.error(`${file}: the reviewer id "${id}" isn't valid.`);
      process.exit(1);
    }
    writeFileSync(target, JSON.stringify(s, null, 2) + '\n');
  }
  console.log(
    `${dryRun ? 'Read' : 'Added'} ${s.entries.length} verdicts from ${s.reviewer!.name || s.reviewer!.id}.`,
  );
}

const owner = existsSync(OWNER_FILE) ? readFileSync(OWNER_FILE, 'utf8').trim() : '';
if (!owner) {
  console.error(
    'No owner set. Run once with --owner <reviewer id> (the id in [brackets] on the Reviewer line).',
  );
  process.exit(1);
}

// 2. Every reviewer's latest verdict on each entry.
const reviewers = new Map<string, Reviewer>();
const latest = new Map<string, Map<string, ReviewEntry>>(); // proverb -> reviewer -> verdict
for (const s of submissions) {
  if (!s.reviewer) continue;
  reviewers.set(s.reviewer.id, s.reviewer); // later submissions carry the newer profile
  for (const e of s.entries) {
    const byReviewer = latest.get(e.proverb_id) ?? new Map<string, ReviewEntry>();
    const previous = byReviewer.get(s.reviewer.id);
    if (!previous || e.updated_at >= previous.updated_at) byReviewer.set(s.reviewer.id, e);
    latest.set(e.proverb_id, byReviewer);
  }
}

// 3. Decide each entry.
const { content, problems } = loadContent();
if (problems.length > 0) {
  console.error(`Content has problems; fix them first:\n${formatProblems(problems)}`);
  process.exit(1);
}

const who = (id: string) => `${reviewers.get(id)?.name || id}${id === owner ? ' (owner)' : ''}`;
const oneLine = (comment: string) => (comment ? `: ${comment.replace(/\n/g, ' / ')}` : '');

interface Approval {
  id: string;
  file: string;
  credits: string[];
}
const approve: Approval[] = [];
const toFix: string[] = [];
const unsure: string[] = [];
const waitingOwner: string[] = [];
const waitingOthers: string[] = [];
const waitingMandarin: string[] = [];
const stale = new Map<string, number>(); // reviewer -> outdated verdicts

for (const lesson of content.lessons) {
  for (const p of lesson.proverbs) {
    const fp = fingerprint({
      ...p,
      text_simp: p.text_simp ?? '',
      pinyin: p.pinyin ?? '',
      jyutping: p.jyutping ?? '',
    });
    const current = new Map<string, ReviewEntry>();
    for (const [rid, e] of latest.get(p.id) ?? []) {
      if (e.fingerprint === fp) current.set(rid, e);
      else stale.set(rid, (stale.get(rid) ?? 0) + 1);
    }
    if (!current.size) continue;

    const verdicts = [...current];
    const oks = verdicts.filter(([, e]) => e.verdict === 'ok').map(([rid]) => rid);
    const ownerOk = oks.includes(owner);
    const otherOks = oks.filter((rid) => rid !== owner);
    const mandarinOks = otherOks.filter((rid) => reviewers.get(rid)?.focus !== 'cantonese');
    const enough = otherOks.length >= need && mandarinOks.length >= needMandarin;

    if (verdicts.some(([, e]) => e.verdict === 'change')) {
      const lines = verdicts.map(
        ([rid, e]) =>
          `    ${VERDICT_MARK[e.verdict]} ${who(rid)} [${reviewers.get(rid)?.focus}]${oneLine(e.comment)}`,
      );
      const split = oks.length ? ' (reviewers disagree: the owner decides)' : '';
      toFix.push(`  ${p.id} (${lesson.file})${split}\n${lines.join('\n')}`);
    } else if (ownerOk && enough) {
      // Everyone who looked at the entry, on any version: the owner first.
      const everyone = [...(latest.get(p.id)?.keys() ?? [])];
      const credits = [owner, ...[...reviewers.keys()].filter((rid) => rid !== owner)]
        .filter((rid) => everyone.includes(rid))
        .map((rid) => reviewers.get(rid)?.credit.trim() ?? '')
        .filter(Boolean);
      const merged = [...new Set([...(p.reviewed_by ?? []), ...credits])];
      if (!p.reviewed || merged.length !== (p.reviewed_by ?? []).length) {
        approve.push({ id: p.id, file: lesson.file, credits: merged });
      }
    } else if (verdicts.some(([, e]) => e.verdict === 'unsure')) {
      const lines = verdicts
        .filter(([, e]) => e.verdict === 'unsure')
        .map(([rid, e]) => `    ? ${who(rid)}${oneLine(e.comment)}`);
      unsure.push(`  ${p.id} (${lesson.file})\n${lines.join('\n')}`);
    } else if (!p.reviewed) {
      if (!ownerOk) waitingOwner.push(p.id);
      else if (otherOks.length < need) waitingOthers.push(p.id);
      else waitingMandarin.push(p.id);
    }
  }
}

// 4. Write the approvals.
for (const [file, approvals] of Map.groupBy(approve, (a) => a.file)) {
  const filePath = join(LESSONS_DIR, file);
  const doc = parseDocument(readFileSync(filePath, 'utf8'));
  const proverbs = doc.get('proverbs');
  if (!isSeq(proverbs)) continue;
  for (const item of proverbs.items) {
    if (!isMap(item)) continue;
    const entry = item as YAMLMap<string, unknown>;
    const approval = approvals.find((a) => a.id === String(entry.get('id')));
    if (!approval) continue;
    entry.set('reviewed', true);
    if (approval.credits.length) {
      const list = doc.createNode(approval.credits);
      list.flow = true;
      entry.set('reviewed_by', list);
    }
  }
  if (!dryRun) {
    writeFileSync(filePath, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
  }
}

// 5. Report.
const section = (title: string, lines: string[]) => {
  if (lines.length) console.log(`\n${title}:\n${lines.join('\n')}`);
};
console.log(`\nReviewers: ${[...reviewers.keys()].map((id) => `${who(id)} [${id}]`).join(', ')}`);
if (!reviewers.has(owner)) console.log(`The owner (${owner}) hasn't sent any verdicts yet.`);
console.log(`${dryRun ? 'Would approve' : 'Approved'} ${approve.length}`);
for (const a of approve) console.log(`  ${a.id}: ${a.credits.join(', ') || '(no credits)'}`);
section(`To fix (${toFix.length})`, toFix);
section(`Unsure (${unsure.length})`, unsure);
section('Waiting for the owner’s ✓', waitingOwner.length ? [`  ${waitingOwner.join(', ')}`] : []);
section(
  `Waiting for ${need} more reviewer${need === 1 ? '' : 's'} to ✓`,
  waitingOthers.length ? [`  ${waitingOthers.join(', ')}`] : [],
);
section(
  'Waiting for a Mandarin reviewer’s ✓',
  waitingMandarin.length ? [`  ${waitingMandarin.join(', ')}`] : [],
);
if (stale.size) {
  const list = [...stale].map(([id, n]) => `${who(id)} ${n}`).join(', ');
  console.log(`\nOutdated verdicts (the entry changed since): ${list}`);
}
