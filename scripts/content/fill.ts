// Fills in text_simp, pinyin and jyutping where an entry has none, keeping the
// file's comments and layout. Never changes an entry marked reviewed: true.
// With --refill, also replaces existing values on unreviewed entries (use after
// improving the generator; hand corrections on those entries are lost).
// Check the results with `npm run content:readings`.
// Usage: npm run content:fill [-- --refill]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMap, isSeq, parseDocument, type YAMLMap } from 'yaml';
import { LESSONS_DIR, lessonFiles } from './load.ts';
import { generateReadings } from './readings.ts';

const refill = process.argv.includes('--refill');
const FIELDS = ['text_simp', 'pinyin', 'jyutping'] as const;

let changed = 0;
for (const file of lessonFiles()) {
  const path = join(LESSONS_DIR, file);
  const doc = parseDocument(readFileSync(path, 'utf8'));
  const proverbs = doc.get('proverbs');
  if (!isSeq(proverbs)) continue;

  let fileChanged = false;
  for (const item of proverbs.items) {
    if (!isMap(item)) continue;
    const entry = item as YAMLMap<string, unknown>;
    if (entry.get('reviewed') === true) continue;
    const trad = entry.get('text_trad');
    if (typeof trad !== 'string') continue;

    const values = generateReadings(trad);
    // New fields go straight after text_trad, in a fixed order.
    let at = entry.items.findIndex((pair) => String(pair.key) === 'text_trad') + 1;
    for (const key of FIELDS) {
      const index = entry.items.findIndex((pair) => String(pair.key) === key);
      if (index >= 0) {
        if (refill && entry.get(key) !== values[key]) {
          entry.set(key, values[key]);
          fileChanged = true;
          changed += 1;
        }
        at = index + 1;
        continue;
      }
      entry.items.splice(at, 0, doc.createPair(key, values[key]) as never);
      at += 1;
      fileChanged = true;
      changed += 1;
    }
    if (values.jyutping.includes('?')) {
      console.warn(
        `${file} ${entry.get('id')}: no Jyutping found for some characters (marked "?")`,
      );
    }
  }
  if (fileChanged) {
    writeFileSync(path, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
    console.log(`Updated lessons/${file}`);
  }
}
console.log(
  changed
    ? `Filled ${changed} field(s). Check them with "npm run content:readings".`
    : 'Nothing to fill.',
);
