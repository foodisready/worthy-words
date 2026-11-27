import { Injectable, inject, resource } from '@angular/core';
import { DbService } from './db.service';

export interface Lesson {
  id: number;
  title_zh: string;
  title_en: string;
}

export interface LessonSummary extends Lesson {
  total: number;
  completed: number;
  /** The lesson's first proverb, as a preview. */
  first_text: string;
}

export interface Theme {
  id: string;
  name_zh: string;
  name_en: string;
  total: number;
}

export interface Proverb {
  id: string;
  lesson_id: number;
  position: number;
  text_trad: string;
  text_simp: string;
  pinyin: string;
  jyutping: string;
  explain_cantonese: string;
  explain_standard: string;
  en_natural: string;
  en_literal: string | null;
  en_equivalent: string | null;
  context_note: string | null;
  reviewed: number;
  /** Theme ids, comma separated. */
  themes: string | null;
  bookmarked: number;
  completed: number;
  note: string | null;
}

const PROVERB_COLUMNS = `
  p.id, p.lesson_id, p.position, p.text_trad, p.text_simp, p.pinyin, p.jyutping,
  p.explain_cantonese, p.explain_standard, p.en_natural, p.en_literal,
  p.en_equivalent, p.context_note, p.reviewed,
  (SELECT group_concat(theme_id) FROM proverb_themes t WHERE t.proverb_id = p.id) AS themes,
  (b.proverb_id IS NOT NULL) AS bookmarked,
  (g.proverb_id IS NOT NULL) AS completed,
  n.body AS note`;

const PROVERB_JOINS = `
  LEFT JOIN user.bookmarks b ON b.proverb_id = p.id
  LEFT JOIN user.progress g ON g.proverb_id = p.id
  LEFT JOIN user.notes n ON n.proverb_id = p.id`;

/** Reads lesson content, joined with the user's own data about it. */
@Injectable({ providedIn: 'root' })
export class ContentRepository {
  private readonly db = inject(DbService);

  /** Every theme, loaded once, for showing theme names on cards. */
  readonly allThemes = resource({ loader: () => this.themes() });

  lessons(): Promise<LessonSummary[]> {
    return this.db.query<LessonSummary>(
      `SELECT l.id, l.title_zh, l.title_en,
              count(p.id) AS total,
              count(g.proverb_id) AS completed,
              (SELECT text_trad FROM proverbs f WHERE f.lesson_id = l.id ORDER BY position LIMIT 1)
                AS first_text
         FROM lessons l
         JOIN proverbs p ON p.lesson_id = l.id
         LEFT JOIN user.progress g ON g.proverb_id = p.id
        GROUP BY l.id
        ORDER BY l.id`,
    );
  }

  async lesson(id: number): Promise<Lesson | undefined> {
    const [lesson] = await this.db.query<Lesson>(
      'SELECT id, title_zh, title_en FROM lessons WHERE id = ?',
      [id],
    );
    return lesson;
  }

  /** Every proverb in book order (about 400 at most). */
  allProverbs(): Promise<Proverb[]> {
    return this.db.query<Proverb>(
      `SELECT ${PROVERB_COLUMNS} FROM proverbs p ${PROVERB_JOINS} ORDER BY p.position`,
    );
  }

  proverbsInLesson(lessonId: number): Promise<Proverb[]> {
    return this.db.query<Proverb>(
      `SELECT ${PROVERB_COLUMNS} FROM proverbs p ${PROVERB_JOINS}
        WHERE p.lesson_id = ? ORDER BY p.position`,
      [lessonId],
    );
  }

  themes(): Promise<Theme[]> {
    return this.db.query<Theme>(
      `SELECT t.id, t.name_zh, t.name_en, count(pt.proverb_id) AS total
         FROM themes t LEFT JOIN proverb_themes pt ON pt.theme_id = t.id
        GROUP BY t.id ORDER BY t.position`,
    );
  }

  async theme(id: string): Promise<Theme | undefined> {
    const [theme] = await this.db.query<Theme>(
      `SELECT t.id, t.name_zh, t.name_en,
              (SELECT count(*) FROM proverb_themes pt WHERE pt.theme_id = t.id) AS total
         FROM themes t WHERE t.id = ?`,
      [id],
    );
    return theme;
  }

  proverbsInTheme(themeId: string): Promise<Proverb[]> {
    return this.db.query<Proverb>(
      `SELECT ${PROVERB_COLUMNS} FROM proverbs p ${PROVERB_JOINS}
        WHERE p.id IN (SELECT proverb_id FROM proverb_themes WHERE theme_id = ?)
        ORDER BY p.position`,
      [themeId],
    );
  }

  /** Bookmarked proverbs and proverbs with a note, in book order. */
  savedProverbs(): Promise<Proverb[]> {
    return this.db.query<Proverb>(
      `SELECT ${PROVERB_COLUMNS} FROM proverbs p ${PROVERB_JOINS}
        WHERE b.proverb_id IS NOT NULL OR n.proverb_id IS NOT NULL
        ORDER BY p.position`,
    );
  }

  /** The proverb at a position counted from 0, wrapping around the book. */
  async proverbAt(index: number): Promise<Proverb | undefined> {
    const [proverb] = await this.db.query<Proverb>(
      `SELECT ${PROVERB_COLUMNS} FROM proverbs p ${PROVERB_JOINS}
        ORDER BY p.position
        LIMIT 1 OFFSET (? % max(1, (SELECT count(*) FROM proverbs)))`,
      [index],
    );
    return proverb;
  }

  async setBookmark(proverbId: string, bookmarked: boolean): Promise<void> {
    if (bookmarked) {
      await this.db.exec(
        'INSERT OR IGNORE INTO user.bookmarks (proverb_id, created_at) VALUES (?, ?)',
        [proverbId, new Date().toISOString()],
      );
    } else {
      await this.db.exec('DELETE FROM user.bookmarks WHERE proverb_id = ?', [proverbId]);
    }
  }

  /** Saves a note; an empty note deletes it. */
  async setNote(proverbId: string, body: string): Promise<void> {
    if (body.trim()) {
      await this.db.exec(
        `INSERT INTO user.notes (proverb_id, body, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (proverb_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
        [proverbId, body, new Date().toISOString()],
      );
    } else {
      await this.db.exec('DELETE FROM user.notes WHERE proverb_id = ?', [proverbId]);
    }
  }
}

/** Pairs each character of a text with its reading; punctuation gets none. */
export function withReadings(text: string, readings: string): { char: string; reading?: string }[] {
  const syllables = readings.trim().split(/\s+/);
  let next = 0;
  return Array.from(text, (char) =>
    /\p{Script=Han}/u.test(char) ? { char, reading: syllables[next++] } : { char },
  );
}
