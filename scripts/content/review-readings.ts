// Prints a review list of readings for entries not yet reviewed: every
// character whose reading depends on meaning, every literary (文讀) reading,
// and every reading changed by hand from what the generator gives.
// Usage: npm run content:readings [-- --all] > review.md
import { hanChars, loadContent, syllables } from './load.ts';
import { generateReadings, LITERARY, POLYPHONES } from './readings.ts';

const all = process.argv.includes('--all');
const { content } = loadContent();

/** The clause (between punctuation) around character index i of a text. */
function clause(text: string, i: number): string {
  const chars = Array.from(text);
  let n = -1;
  let at = 0;
  chars.forEach((c, k) => {
    if (/\p{Script=Han}/u.test(c) && ++n === i) at = k;
  });
  let start = at;
  let end = at;
  while (start > 0 && /\p{Script=Han}/u.test(chars[start - 1])) start--;
  while (end < chars.length - 1 && /\p{Script=Han}/u.test(chars[end + 1])) end++;
  return chars
    .slice(start, end + 1)
    .map((c, k) => (start + k === at ? `**${c}**` : c))
    .join('');
}

let flagged = 0;
let listed = 0;
const out: string[] = ['# Readings to review', ''];
for (const { lesson, proverbs } of content.lessons) {
  const lines: string[] = [];
  for (const p of proverbs) {
    if (p.reviewed && !all) continue;
    if (!p.pinyin || !p.jyutping) continue;
    const chars = hanChars(p.text_trad);
    const py = syllables(p.pinyin);
    const jp = syllables(p.jyutping);
    const generated = generateReadings(p.text_trad);
    const genPy = syllables(generated.pinyin);
    const genJp = syllables(generated.jyutping);
    const rows: string[] = [];

    chars.forEach((c, i) => {
      const notes: string[] = [];
      const senses = POLYPHONES[c];
      if (senses) {
        const match = senses.find((s) => s.pinyin === py[i] && s.jyutping === jp[i]);
        if (match) notes.push(`"${match.meaning}"`);
        else {
          notes.push('⚠ matches no listed sense');
          flagged++;
        }
        const others = senses.filter((s) => s !== match);
        if (others.length) {
          notes.push(
            `others: ${others.map((s) => `${s.pinyin}/${s.jyutping} ${s.meaning}`).join('; ')}`,
          );
        }
      }
      const literary = LITERARY[c];
      if (literary && Object.values(literary).includes(jp[i])) {
        const colloquial = Object.keys(literary).find((k) => literary[k] === jp[i]);
        notes.push(`文讀 (colloquial ${colloquial})`);
      }
      if (py[i] !== genPy[i] || jp[i] !== genJp[i]) {
        notes.push(`edited by hand (generator: ${genPy[i]} / ${genJp[i]})`);
      }
      if (notes.length) {
        listed++;
        rows.push(`  - ${clause(p.text_trad, i)}: **${py[i]} / ${jp[i]}**. ${notes.join('. ')}`);
      }
    });
    if (rows.length) lines.push(`- **${p.id}** ${p.text_trad}`, ...rows);
  }
  if (lines.length) out.push(`## ${lesson.title_zh} ${lesson.title_en}`, '', ...lines, '');
}
out.push(`${listed} reading(s) listed, ${flagged} flagged ⚠.`);
console.log(out.join('\n'));
