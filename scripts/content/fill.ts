// Fills in text_simp, pinyin and jyutping where an entry has none, keeping the
// file's comments and layout. Never changes an entry marked reviewed: true, and
// never replaces a value that is already there. Check the results by hand,
// especially characters with more than one reading.
// Usage: npm run content:fill
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as OpenCC from 'opencc-js';
import { pinyin } from 'pinyin-pro';
import ToJyutping from 'to-jyutping';
import { isMap, isSeq, parseDocument, type YAMLMap } from 'yaml';
import { LESSONS_DIR, hanChars, lessonFiles } from './load.ts';

const toSimplified = OpenCC.Converter({ from: 'hk', to: 'cn' });

function readings(trad: string) {
  const simp = toSimplified(trad);
  // Pinyin is read from the simplified text, which pinyin-pro knows better
  // (for example 幾 is read jī, but 几 in 幾人 is jǐ).
  const py = pinyin(simp, { type: 'array', nonZh: 'removed' }).join(' ');
  const jp = ToJyutping.getJyutpingList(trad)
    .filter(([char]) => hanChars(char).length > 0)
    .map(([char, reading]) => reading?.split(' ')[0] ?? `?${char}`)
    .join(' ');
  return { text_simp: simp, pinyin: py, jyutping: jp };
}

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

    const values = readings(trad);
    // Insert new fields straight after text_trad, in a fixed order.
    let at = entry.items.findIndex((pair) => String(pair.key) === 'text_trad') + 1;
    for (const key of ['text_simp', 'pinyin', 'jyutping'] as const) {
      const index = entry.items.findIndex((pair) => String(pair.key) === key);
      if (index >= 0) {
        at = index + 1;
        continue;
      }
      entry.items.splice(at, 0, doc.createPair(key, values[key]) as never);
      at += 1;
      fileChanged = true;
      changed += 1;
      if (values[key].includes('?')) {
        console.warn(
          `${file} ${entry.get('id')}: no ${key} found for some characters (marked "?")`,
        );
      }
    }
  }
  if (fileChanged) {
    writeFileSync(path, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
    console.log(`Updated lessons/${file}`);
  }
}
console.log(changed ? `Filled ${changed} field(s). Check them by hand.` : 'Nothing to fill.');
