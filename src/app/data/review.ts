// A reviewer's verdicts on lesson entries, and the formats they leave the app in.
// Shared by the app (the /review page) and scripts/content/apply-review.ts, so
// both compute the same fingerprint. Keep this file free of imports.

export type Verdict = 'ok' | 'change' | 'unsure';

export interface ReviewEntry {
  proverb_id: string;
  verdict: Verdict;
  comment: string;
  /** Fingerprint of the entry as the reviewer saw it. */
  fingerprint: string;
  updated_at: string;
}

export interface ReviewFile {
  format: typeof REVIEW_FORMAT;
  version: 1;
  exported_at: string;
  entries: ReviewEntry[];
}

export const REVIEW_FORMAT = 'worthy-words-review';

export const VERDICT_MARK: Record<Verdict, string> = { ok: '✓', change: '✎', unsure: '?' };

/** The fields a reviewer checks. A change to any of them needs a new review. */
export interface Reviewable {
  text_trad: string;
  text_simp: string;
  pinyin: string;
  jyutping: string;
  explain_cantonese: string;
  explain_standard: string;
  en_natural: string;
  en_literal?: string | null;
  en_equivalent?: string | null;
  context_note?: string | null;
  /** Theme ids. */
  themes: readonly string[];
}

/** A short, stable fingerprint of an entry's reviewable content (cyrb53, hex). */
export function fingerprint(entry: Reviewable): string {
  const text = JSON.stringify([
    entry.text_trad,
    entry.text_simp,
    entry.pinyin,
    entry.jyutping,
    entry.explain_cantonese,
    entry.explain_standard,
    entry.en_natural,
    entry.en_literal ?? '',
    entry.en_equivalent ?? '',
    entry.context_note ?? '',
    [...entry.themes].sort(),
  ]);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, '0');
}

/**
 * Verdicts as plain text, for pasting into a chat or an issue. One entry per
 * block:
 *
 *     ✎ zgxw-012 [1a2b3c4d5e6f70]
 *       解釋 should say …
 */
export function reviewText(entries: readonly ReviewEntry[]): string {
  const lines = ['Worthy Words review', ''];
  for (const e of [...entries].sort((a, b) => a.proverb_id.localeCompare(b.proverb_id))) {
    lines.push(`${VERDICT_MARK[e.verdict]} ${e.proverb_id} [${e.fingerprint}]`);
    for (const line of e.comment.trim().split('\n').filter(Boolean)) lines.push(`  ${line}`);
  }
  return lines.join('\n') + '\n';
}

/** Reads verdicts from an exported JSON file or from pasted text. Throws a readable message. */
export function parseReview(input: string): ReviewEntry[] {
  const trimmed = input.trim();
  if (trimmed.startsWith('{')) {
    let data: Partial<ReviewFile>;
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error('The review file isn’t valid JSON.');
    }
    if (data.format !== REVIEW_FORMAT || !Array.isArray(data.entries)) {
      throw new Error('This isn’t a Worthy Words review file.');
    }
    for (const e of data.entries) {
      if (
        !e ||
        typeof e.proverb_id !== 'string' ||
        !(e.verdict in VERDICT_MARK) ||
        typeof e.comment !== 'string' ||
        typeof e.fingerprint !== 'string'
      ) {
        throw new Error('The review file has a damaged entry.');
      }
    }
    return data.entries;
  }

  const marks = Object.entries(VERDICT_MARK) as [Verdict, string][];
  const entries: ReviewEntry[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const head = /^\s*(✓|✎|\?)\s+(zgxw-\d{3})\s+\[([0-9a-f]+)\]\s*$/.exec(line);
    if (head) {
      const verdict = marks.find(([, mark]) => mark === head[1])![0];
      entries.push({
        proverb_id: head[2],
        verdict,
        comment: '',
        fingerprint: head[3],
        updated_at: '',
      });
    } else if (entries.length && /^\s+\S/.test(line)) {
      const last = entries[entries.length - 1];
      last.comment += (last.comment ? '\n' : '') + line.trim();
    }
  }
  if (!entries.length) throw new Error('No review entries found.');
  return entries;
}
