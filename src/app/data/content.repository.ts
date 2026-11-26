import { Injectable, inject } from '@angular/core';
import { DbService } from './db.service';

export interface Lesson {
  id: number;
  title_zh: string;
  title_en: string;
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
  reviewed: number;
  bookmarked: number;
}

/** Reads lesson content and the user's own data about it. */
@Injectable({ providedIn: 'root' })
export class ContentRepository {
  private readonly db = inject(DbService);

  lessons(): Promise<Lesson[]> {
    return this.db.query<Lesson>('SELECT id, title_zh, title_en FROM lessons ORDER BY id');
  }

  proverbsInLesson(lessonId: number): Promise<Proverb[]> {
    return this.db.query<Proverb>(
      `SELECT p.id, p.lesson_id, p.position, p.text_trad, p.text_simp, p.pinyin, p.jyutping,
              p.explain_cantonese, p.explain_standard, p.en_natural, p.en_literal,
              p.en_equivalent, p.reviewed,
              (b.proverb_id IS NOT NULL) AS bookmarked
         FROM proverbs p
         LEFT JOIN user.bookmarks b ON b.proverb_id = p.id
        WHERE p.lesson_id = ?
        ORDER BY p.position`,
      [lessonId],
    );
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
}

/** Pairs each character of a text with its reading; punctuation gets none. */
export function withReadings(text: string, readings: string): { char: string; reading?: string }[] {
  const syllables = readings.trim().split(/\s+/);
  let next = 0;
  return Array.from(text, (char) =>
    /\p{Script=Han}/u.test(char) ? { char, reading: syllables[next++] } : { char },
  );
}
