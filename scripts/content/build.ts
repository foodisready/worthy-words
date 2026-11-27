// Builds public/data/content.db from content/, for the app to load.
// Usage: npm run content:build [-- --reviewed-only]
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  CONTENT_DIR,
  formatProblems,
  loadContent,
  tonelessJyutping,
  tonelessPinyin,
} from './load.ts';

const OUT_DIR = new URL('../../public/data/', import.meta.url).pathname;
const OUT_FILE = join(OUT_DIR, 'content.db');
const reviewedOnly = process.argv.includes('--reviewed-only');

const { content, problems } = loadContent();
if (problems.length > 0) {
  console.error(`Not building: content has problems:\n${formatProblems(problems)}`);
  process.exit(1);
}

const lessons = content.lessons
  .map((l) => ({ ...l, proverbs: l.proverbs.filter((p) => !reviewedOnly || p.reviewed) }))
  .filter((l) => l.proverbs.length > 0)
  .sort((a, b) => a.lesson.id - b.lesson.id);

for (const p of lessons.flatMap((l) => l.proverbs)) {
  if (!p.text_simp || !p.pinyin || !p.jyutping) {
    console.error(
      `Not building: ${p.id} has no simplified text or readings. Run "npm run content:fill".`,
    );
    process.exit(1);
  }
}

// The version changes only when the content does, so the app's service worker
// downloads a new content.db only when there is something new.
const version = createHash('sha256')
  .update(JSON.stringify({ themes: content.themes, lessons, reviewedOnly }))
  .update(readFileSync(join(CONTENT_DIR, 'schema.sql')))
  .digest('hex')
  .slice(0, 16);

mkdirSync(OUT_DIR, { recursive: true });
const tmp = `${OUT_FILE}.tmp`;
rmSync(tmp, { force: true });
const db = new DatabaseSync(tmp);
db.exec(readFileSync(join(CONTENT_DIR, 'schema.sql'), 'utf8'));

const insertMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
insertMeta.run('version', version);
insertMeta.run('schema', '1');

const insertTheme = db.prepare(
  'INSERT INTO themes (id, position, name_zh, name_en) VALUES (?, ?, ?, ?)',
);
content.themes.forEach((t, i) => insertTheme.run(t.id, i + 1, t.name_zh, t.name_en));

const insertLesson = db.prepare('INSERT INTO lessons (id, title_zh, title_en) VALUES (?, ?, ?)');
const insertProverb = db.prepare(`
  INSERT INTO proverbs (
    id, lesson_id, position, text_trad, text_simp, pinyin, jyutping,
    explain_cantonese, explain_standard, en_natural, en_literal, en_equivalent,
    context_note, insight, reviewed, reviewed_by, search_text
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insertProverbTheme = db.prepare(
  'INSERT INTO proverb_themes (proverb_id, theme_id) VALUES (?, ?)',
);

let position = 0;
db.exec('BEGIN');
for (const { lesson, proverbs } of lessons) {
  insertLesson.run(lesson.id, lesson.title_zh, lesson.title_en);
  for (const p of proverbs) {
    position += 1;
    const py = tonelessPinyin(p.pinyin!);
    const jp = tonelessJyutping(p.jyutping!);
    const searchText = [
      p.text_trad,
      p.text_simp,
      py,
      py.replace(/\s+/g, ''),
      jp,
      jp.replace(/\s+/g, ''),
      p.en_natural,
      p.en_literal,
      p.en_equivalent,
    ]
      .filter(Boolean)
      .join('\n')
      .toLowerCase();
    insertProverb.run(
      p.id,
      lesson.id,
      position,
      p.text_trad,
      p.text_simp!,
      p.pinyin!,
      p.jyutping!,
      p.explain_cantonese,
      p.explain_standard,
      p.en_natural,
      p.en_literal ?? null,
      p.en_equivalent ?? null,
      p.context_note ?? null,
      null,
      p.reviewed ? 1 : 0,
      p.reviewed_by?.length ? JSON.stringify(p.reviewed_by) : null,
      searchText,
    );
    for (const theme of p.themes) insertProverbTheme.run(p.id, theme);
  }
}
db.exec('COMMIT');
db.exec('VACUUM');
db.close();
renameSync(tmp, OUT_FILE);

console.log(
  `Built public/data/content.db: ${lessons.length} lesson(s), ${position} proverb(s), version ${version}` +
    (reviewedOnly ? ' (reviewed entries only)' : ''),
);
