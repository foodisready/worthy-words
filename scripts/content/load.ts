// Reads and checks the lesson content in content/. Shared by the validate,
// fill and build scripts.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

export const CONTENT_DIR = new URL('../../content/', import.meta.url).pathname;
export const LESSONS_DIR = join(CONTENT_DIR, 'lessons');

const text = z.string().trim().min(1);

export const themeSchema = z.strictObject({
  id: z.string().regex(/^[a-z]+(-[a-z]+)*$/, 'use lower-case words joined by "-"'),
  name_zh: text,
  name_en: text,
});

export const proverbSchema = z.strictObject({
  id: z.string().regex(/^zgxw-\d{3}$/, 'use the form zgxw-001'),
  themes: z.array(z.string()).min(1),
  text_trad: text,
  text_simp: text.optional(),
  pinyin: text.optional(),
  jyutping: text.optional(),
  explain_cantonese: text,
  explain_standard: text,
  en_natural: text,
  en_literal: text.optional(),
  en_equivalent: text.optional(),
  context_note: text.optional(),
  reviewed: z.boolean(),
});

export const lessonFileSchema = z.strictObject({
  lesson: z.strictObject({
    id: z.number().int().positive(),
    title_zh: text,
    title_en: text,
  }),
  proverbs: z.array(proverbSchema).min(1),
});

export type Theme = z.infer<typeof themeSchema>;
export type Proverb = z.infer<typeof proverbSchema>;
export type LessonFile = z.infer<typeof lessonFileSchema>;

export interface Content {
  themes: Theme[];
  lessons: (LessonFile & { file: string })[];
}

export interface Problem {
  file: string;
  where: string;
  message: string;
}

const HAN = /\p{Script=Han}/gu;

/** The Han characters of a text, without punctuation. */
export function hanChars(value: string): string[] {
  return value.match(HAN) ?? [];
}

export function syllables(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

export function lessonFiles(): string[] {
  return readdirSync(LESSONS_DIR)
    .filter((name) => name.endsWith('.yaml'))
    .sort();
}

function issuesToProblems(file: string, error: z.ZodError): Problem[] {
  return error.issues.map((issue) => ({
    file,
    where: issue.path.join('.') || '(file)',
    message: issue.message,
  }));
}

/** Reads every content file. Returns the content and any problems found. */
export function loadContent(): { content: Content; problems: Problem[] } {
  const problems: Problem[] = [];

  const themesResult = z
    .array(themeSchema)
    .safeParse(parse(readFileSync(join(CONTENT_DIR, 'themes.yaml'), 'utf8')));
  const themes = themesResult.success ? themesResult.data : [];
  if (!themesResult.success) problems.push(...issuesToProblems('themes.yaml', themesResult.error));

  const lessons: Content['lessons'] = [];
  for (const file of lessonFiles()) {
    const result = lessonFileSchema.safeParse(parse(readFileSync(join(LESSONS_DIR, file), 'utf8')));
    if (result.success) lessons.push({ ...result.data, file });
    else problems.push(...issuesToProblems(`lessons/${file}`, result.error));
  }

  const content = { themes, lessons };
  problems.push(...checkContent(content));
  return { content, problems };
}

/** Checks that span entries and files: ids, themes, and readings lining up with characters. */
export function checkContent(content: Content): Problem[] {
  const problems: Problem[] = [];
  const themeIds = new Set<string>();
  for (const theme of content.themes) {
    if (themeIds.has(theme.id)) {
      problems.push({ file: 'themes.yaml', where: theme.id, message: 'theme id used twice' });
    }
    themeIds.add(theme.id);
  }

  const lessonIds = new Set<number>();
  const proverbIds = new Set<string>();
  for (const { file, lesson, proverbs } of content.lessons) {
    const at = `lessons/${file}`;
    if (lessonIds.has(lesson.id)) {
      problems.push({
        file: at,
        where: 'lesson.id',
        message: `lesson ${lesson.id} is in two files`,
      });
    }
    lessonIds.add(lesson.id);

    proverbs.forEach((p, i) => {
      const where = `proverbs.${i} (${p.id})`;
      const problem = (message: string) => problems.push({ file: at, where, message });

      if (proverbIds.has(p.id)) problem('proverb id used twice');
      proverbIds.add(p.id);

      for (const theme of p.themes) {
        if (!themeIds.has(theme)) problem(`unknown theme "${theme}"`);
      }

      const chars = hanChars(p.text_trad);
      if (p.text_simp !== undefined && hanChars(p.text_simp).length !== chars.length) {
        problem(
          `text_simp has ${hanChars(p.text_simp).length} characters, text_trad has ${chars.length}`,
        );
      }
      for (const field of ['pinyin', 'jyutping'] as const) {
        const value = p[field];
        if (value === undefined) {
          if (p.reviewed) problem(`${field} is missing on a reviewed entry`);
          continue;
        }
        const count = syllables(value).length;
        if (count !== chars.length) {
          problem(`${field} has ${count} syllables for ${chars.length} characters`);
        }
      }
      if (p.jyutping !== undefined) {
        for (const s of syllables(p.jyutping)) {
          if (!/^[a-z]+[1-6]$/.test(s)) problem(`jyutping "${s}" should be letters and a tone 1-6`);
        }
      }
      if (p.reviewed && p.text_simp === undefined)
        problem('text_simp is missing on a reviewed entry');
    });
  }
  return problems;
}

export function formatProblems(problems: Problem[]): string {
  return problems.map((p) => `  ${p.file} → ${p.where}: ${p.message}`).join('\n');
}

/** Pinyin without tone marks, e.g. "lù yáo" → "lu yao". */
export function tonelessPinyin(value: string): string {
  return value
    .toLowerCase()
    .replace(/[üǖǘǚǜ]/g, 'v')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Jyutping without tone numbers, e.g. "lou6 jiu4" → "lou jiu". */
export function tonelessJyutping(value: string): string {
  return value.replace(/[1-6]/g, '').toLowerCase();
}
