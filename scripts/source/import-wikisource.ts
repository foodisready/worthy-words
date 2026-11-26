// Builds content/source/ from fixed revisions of Chinese Wikisource's
// 《增廣昔時賢文》 (public domain, {{PD-old}}). See content/source/README.md.
//
// - Base text: revision 1955020 (2020-06-29), about 3,800 characters ending
//   奉勸君子，各宜守己。只此呈示，萬無一失。 It matches an independent modern
//   copy far better (93–98% of clauses) than later revisions do, so it is the
//   common edition as people know it.
// - Second witness: revision 2614365 (2025-11-09), the last revision before
//   the page header was vandalised on 2026-03-29. Its 上集 is an expanded text
//   (about 90 more lines) in old character forms, with readings marked 一作.
//   Its readings become variants; lines found only there go to
//   expanded-additions.yaml, and its 下集, a later supplement (補遺), to
//   supplement.yaml.
// - content/source/corrections.yaml holds reviewed fixes to the base text,
//   each with its reason. The base reading is then kept as a variant.
//
// Old character forms (舊字形) become Hong Kong standard forms through the
// explicit table below, so every change can be reviewed.
//
// Usage: node scripts/source/import-wikisource.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';

const PAGE = 'https://zh.wikisource.org/w/index.php';
const BASE_REVISION = 1955020;
const SECOND_REVISION = 2614365;
const OUT_DIR = new URL('../../content/source/', import.meta.url).pathname;

/** Old form → Hong Kong standard form. */
// prettier-ignore
export const GLYPHS: Record<string, string> = {
  爲: '為', 説: '說', 髙: '高', 淸: '清', 眞: '真', 鄕: '鄉', 衆: '眾', 疎: '疏',
  虚: '虛', 縁: '緣', 値: '值', 歳: '歲', 渉: '涉', 妬: '妒', 歩: '步', 鷄: '雞',
  旣: '既', 晩: '晚', 撃: '擊', 顔: '顏', 抛: '拋', 甁: '瓶', 愼: '慎', 渇: '渴',
  巻: '卷', 尙: '尚', 内: '內', 偸: '偷', 緑: '綠', 粧: '妝', 箇: '個', 痴: '癡',
  裡: '裏', 台: '臺', 鑒: '鑑',
};

export const normalise = (text: string) => Array.from(text, (c) => GLYPHS[c] ?? c).join('');

/** Other forms of the same character, ignored when comparing witnesses. */
const SAME_CHARACTER: Record<string, string> = { 着: '著' };
const comparable = (text: string) =>
  Array.from(han(normalise(text)), (c) => SAME_CHARACTER[c] ?? c).join('');
const han = (text: string) => text.match(/\p{Script=Han}/gu)?.join('') ?? '';

interface Line {
  part: string;
  text: string;
  /** Alternative readings marked in the text itself (一作): [main, alternative]. */
  marked: [string, string][];
}

interface Variant {
  reading: string;
  source: string;
}

async function fetchRevision(id: number): Promise<string> {
  const response = await fetch(`${PAGE}?oldid=${id}&action=raw`, {
    headers: { 'user-agent': 'worthy-words-content-import/0.1' },
  });
  if (!response.ok) throw new Error(`Wikisource revision ${id}: HTTP ${response.status}`);
  return response.text();
}

export function parseWikitext(raw: string): Line[] {
  const lines: Line[] = [];
  let part = '';
  let inPoem = false;
  for (const rawLine of raw.split('\n')) {
    const heading = rawLine.match(/^==\s*(.+?)\s*==/);
    if (heading) {
      part = heading[1];
      continue;
    }
    if (rawLine.includes('<poem>')) inPoem = true;
    if (rawLine.includes('</poem>')) inPoem = false;
    if (!inPoem) continue;
    let text = rawLine
      .replace(/<\/?poem>/g, '')
      .replace(/^#/, '')
      .trim();
    // -{…}- only stops the site's automatic script conversion; it may nest.
    while (/-\{(.*?)\}-/.test(text)) text = text.replace(/-\{(.*?)\}-/g, '$1');
    const marked: [string, string][] = [];
    text = text.replace(/\{\{另\|([^|}]*)\|([^}]*)\}\}/g, (_, main: string, alt: string) => {
      marked.push([main, alt]);
      return main;
    });
    if (han(text)) lines.push({ part, text: normalise(text), marked });
  }
  return lines;
}

/** Length of the longest common subsequence of two strings. */
function common(a: string, b: string): number {
  const A = Array.from(a);
  const B = Array.from(b);
  let prev = new Array<number>(B.length + 1).fill(0);
  for (let i = 1; i <= A.length; i++) {
    const row = new Array<number>(B.length + 1).fill(0);
    for (let j = 1; j <= B.length; j++) {
      row[j] = A[i - 1] === B[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], row[j - 1]);
    }
    prev = row;
  }
  return prev[B.length];
}

const similarity = (a: string, b: string) =>
  (2 * common(a, b)) / (Array.from(a).length + Array.from(b).length || 1);

/** Applies a 一作 mark to a line, giving the alternative reading. */
const applyMark = (text: string, [main, alt]: [string, string]) =>
  text.replace(normalise(main), normalise(alt));

async function main() {
  const base = parseWikitext(await fetchRevision(BASE_REVISION));
  const second = parseWikitext(await fetchRevision(SECOND_REVISION));
  const expanded = second.filter((l) => l.part === '上集');
  const expandedKeys = expanded.map((l) => comparable(l.text));

  const correctionsFile = `${OUT_DIR}corrections.yaml`;
  type Correction = { n?: number; insert_after?: number; text: string; reason: string };
  const allCorrections: Correction[] = existsSync(correctionsFile)
    ? (parse(readFileSync(correctionsFile, 'utf8')) ?? [])
    : [];
  const corrections = new Map(
    allCorrections.filter((c) => c.n !== undefined).map((c) => [c.n!, c]),
  );
  const inserts = allCorrections.filter((c) => c.insert_after !== undefined);
  for (const c of allCorrections) {
    const at = c.n ?? c.insert_after ?? 0;
    if (at < 1 || at > base.length) throw new Error(`corrections.yaml: no line ${at}`);
  }

  const used = new Set<number>();
  const entries = base.map((line, index) => {
    const n = index + 1;
    const key = comparable(line.text);
    // The closest line of the second witness, or two of its lines joined
    // (the witnesses split some couplets differently).
    let best = { score: 0, text: '', marks: [] as string[], indices: [] as number[] };
    expandedKeys.forEach((k, i) => {
      const options: [string, number[]][] = [[k, [i]]];
      if (i + 1 < expandedKeys.length) options.push([k + expandedKeys[i + 1], [i, i + 1]]);
      for (const [candidate, indices] of options) {
        const score = similarity(key, candidate);
        if (score > best.score) {
          const lines = indices.map((x) => expanded[x]);
          best = {
            score,
            indices,
            text: lines.map((l) => l.text).join(''),
            marks: lines.flatMap((l) => l.marked.map((m) => applyMark(l.text, m))),
          };
        }
      }
    });

    const variants: Variant[] = [];
    if (best.score >= 0.6) {
      best.indices.forEach((i) => used.add(i));
      const other = comparable(best.text);
      // A neighbouring line joined on is not a variant.
      if (other !== key && !other.startsWith(key) && !other.endsWith(key)) {
        variants.push({ reading: best.text, source: `Wikisource ${SECOND_REVISION}` });
      }
      for (const reading of best.marks) {
        variants.push({ reading, source: `Wikisource ${SECOND_REVISION} (marked 一作)` });
      }
    }

    let text = line.text;
    let note: string | undefined;
    const correction = corrections.get(n);
    if (correction) {
      if (comparable(correction.text) !== key) {
        variants.unshift({
          reading: line.text,
          source: `Wikisource ${BASE_REVISION} (before correction)`,
        });
      }
      text = correction.text;
      note = correction.reason;
    }
    // Keep only readings that differ from the chosen text, once each.
    const seen = new Set([comparable(text)]);
    const unique = variants.filter(
      (v) => !seen.has(comparable(v.reading)) && seen.add(comparable(v.reading)),
    );

    const entry: Record<string, unknown> = { n, text };
    if (unique.length) entry['variants'] = unique;
    if (note) entry['note'] = note;
    return entry;
  });

  // Lines missing from the base text, restored after the line they follow.
  // They are numbered after it: 96a, 96b, ...
  const lines = entries.flatMap((entry) => {
    const after = inserts.filter((c) => c.insert_after === entry['n']);
    return [
      entry,
      ...after.map((c, k) => ({
        n: `${entry['n']}${String.fromCharCode(97 + k)}`,
        text: c.text,
        note: c.reason,
      })),
    ];
  });
  const inserted = new Set(inserts.map((c) => comparable(c.text)));

  const additions = expanded
    .map((l, i) => ({ text: l.text, i }))
    .filter(({ i, text }) => !used.has(i) && !inserted.has(comparable(text)))
    .map(({ text }, k) => ({ n: k + 1, text }));
  const supplement = second
    .filter((l) => l.part === '下集')
    .map((l, k) => {
      const entry: Record<string, unknown> = { n: k + 1, text: l.text };
      if (l.marked.length) {
        entry['variants'] = l.marked.map((m) => ({
          reading: applyMark(l.text, m),
          source: `Wikisource ${SECOND_REVISION} (marked 一作)`,
        }));
      }
      return entry;
    });

  mkdirSync(OUT_DIR, { recursive: true });
  const header = (title: string, revision: number) =>
    `# ${title}\n` +
    `# Generated by scripts/source/import-wikisource.ts from Chinese Wikisource revision\n` +
    `# ${revision} (public domain). Do not edit by hand: fix the base text in\n` +
    `# corrections.yaml and run the script again.\n`;
  const write = (file: string, title: string, revision: number, data: unknown) =>
    writeFileSync(`${OUT_DIR}${file}`, header(title, revision) + stringify(data, { lineWidth: 0 }));

  write('common-edition.yaml', '增廣賢文: common edition (通行本)', BASE_REVISION, lines);
  write(
    'expanded-additions.yaml',
    '增廣賢文: lines found only in the expanded text',
    SECOND_REVISION,
    additions,
  );
  write('supplement.yaml', '增廣賢文: supplement (補遺, 下集)', SECOND_REVISION, supplement);

  const chars = (list: { text?: unknown }[]) =>
    list.reduce((n, e) => n + han(String(e.text)).length, 0);
  console.log(
    `common-edition.yaml: ${lines.length} lines, ${chars(lines)} characters, ` +
      `${entries.filter((e) => e['variants']).length} with variants, ${corrections.size} corrected, ${inserts.length} restored`,
  );
  console.log(`expanded-additions.yaml: ${additions.length} lines, ${chars(additions)} characters`);
  console.log(`supplement.yaml: ${supplement.length} lines, ${chars(supplement)} characters`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
