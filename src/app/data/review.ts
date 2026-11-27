// A reviewer's verdicts on lesson entries, and the formats they leave the app in.
// Shared by the app (the /review page) and scripts/content/apply-review.ts, so
// both compute the same fingerprint. Keep this file free of imports.

export type Verdict = 'ok' | 'change' | 'unsure';
export type Focus = 'cantonese' | 'mandarin' | 'both';

export interface ReviewEntry {
  proverb_id: string;
  verdict: Verdict;
  comment: string;
  /** Fingerprint of the entry as the reviewer saw it. */
  fingerprint: string;
  updated_at: string;
}

/** Who gave the verdicts. The id tells apart reviewers with the same name. */
export interface Reviewer {
  id: string;
  name: string;
  /** How to thank them in the app; empty for no credit. */
  credit: string;
  focus: Focus;
}

export interface ReviewFile {
  format: typeof REVIEW_FORMAT;
  version: 1;
  exported_at: string;
  reviewer?: Reviewer;
  entries: ReviewEntry[];
}

export interface Submission {
  reviewer?: Reviewer;
  entries: ReviewEntry[];
}

export const REVIEW_FORMAT = 'worthy-words-review';

export const VERDICT_MARK: Record<Verdict, string> = { ok: '✓', change: '✎', unsure: '?' };

export const FOCUS_LABEL: Record<Focus, string> = {
  cantonese: '粵 Cantonese',
  mandarin: '普 Mandarin',
  both: '粵普 both',
};

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
 * Verdicts as plain text, for pasting into a chat or an issue:
 *
 *     Worthy Words review
 *     Reviewer: Ann Lee [a1b2c3d4] · credit: A.L. · checking: cantonese
 *
 *     ✎ zgxw-012 [1a2b3c4d5e6f70]
 *       解釋 should say …
 */
export function reviewText(submission: Submission): string {
  const lines = ['Worthy Words review'];
  const r = submission.reviewer;
  if (r) {
    lines.push(
      `Reviewer: ${oneLine(r.name) || '(no name)'} [${r.id}] · credit: ${oneLine(r.credit) || '(none)'} · checking: ${r.focus}`,
    );
  }
  lines.push('');
  const sorted = [...submission.entries].sort((a, b) => a.proverb_id.localeCompare(b.proverb_id));
  for (const e of sorted) {
    lines.push(`${VERDICT_MARK[e.verdict]} ${e.proverb_id} [${e.fingerprint}]`);
    for (const line of e.comment.trim().split('\n').filter(Boolean)) lines.push(`  ${line}`);
  }
  return lines.join('\n') + '\n';
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

const FOCUSES = Object.keys(FOCUS_LABEL) as Focus[];

/** Reads verdicts from an exported JSON file or from pasted text. Throws a readable message. */
export function parseReview(input: string): Submission {
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
    const r = data.reviewer;
    const reviewer =
      r && typeof r.id === 'string' && r.id
        ? {
            id: r.id,
            name: String(r.name ?? ''),
            credit: String(r.credit ?? ''),
            focus: FOCUSES.includes(r.focus) ? r.focus : 'both',
          }
        : undefined;
    return { reviewer, entries: data.entries };
  }

  const marks = Object.entries(VERDICT_MARK) as [Verdict, string][];
  const entries: ReviewEntry[] = [];
  let reviewer: Reviewer | undefined;
  for (const line of trimmed.split(/\r?\n/)) {
    const who = /^\s*Reviewer: (.*) \[([0-9a-z]+)\] · credit: (.*) · checking: (\w+)\s*$/.exec(
      line,
    );
    if (who) {
      reviewer = {
        id: who[2],
        name: who[1] === '(no name)' ? '' : who[1],
        credit: who[3] === '(none)' ? '' : who[3],
        focus: FOCUSES.includes(who[4] as Focus) ? (who[4] as Focus) : 'both',
      };
      continue;
    }
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
  return { reviewer, entries };
}

/** Suggests initials for a name: "Ann Lee" → "A.L.". None for a name in Chinese characters. */
export function initials(name: string): string {
  const clean = oneLine(name);
  if (!clean || /\p{Script=Han}/u.test(clean)) return '';
  return clean
    .split(' ')
    .map((w) => w[0]!.toUpperCase() + '.')
    .join('');
}
