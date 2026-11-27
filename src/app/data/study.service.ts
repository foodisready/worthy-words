import { Injectable, inject, signal } from '@angular/core';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type Backup,
  importStatements,
  parseBackup,
  PRIVATE_SETTINGS,
} from './backup';
import { currentStreak, localDay, longestStreak } from './dates';
import { DbService } from './db.service';

export interface StudySummary {
  completed: number;
  total: number;
  streak: number;
  bestStreak: number;
  studiedToday: boolean;
  /** The first lesson with a proverb not yet completed; undefined once the book is done. */
  nextLessonId: number | undefined;
}

/** Progress through the book, study days and streaks, and backups. */
@Injectable({ providedIn: 'root' })
export class StudyService {
  private readonly db = inject(DbService);

  /** Goes up whenever progress changes, so pages can reload what they show. */
  readonly revision = signal(0);

  async summary(today = localDay()): Promise<StudySummary> {
    const [counts] = await this.db.query<{ completed: number; total: number }>(
      `SELECT (SELECT count(*) FROM user.progress g JOIN proverbs p ON p.id = g.proverb_id)
                AS completed,
              (SELECT count(*) FROM proverbs) AS total`,
    );
    const days = (await this.db.query<{ day: string }>('SELECT day FROM user.study_days')).map(
      (r) => r.day,
    );
    const [next] = await this.db.query<{ lesson_id: number }>(
      `SELECT p.lesson_id FROM proverbs p
        WHERE p.id NOT IN (SELECT proverb_id FROM user.progress)
        ORDER BY p.position LIMIT 1`,
    );
    return {
      ...counts,
      streak: currentStreak(days, today),
      bestStreak: longestStreak(days),
      studiedToday: days.includes(today),
      nextLessonId: next?.lesson_id,
    };
  }

  /** Marks proverbs as completed and today as a study day. */
  async complete(proverbIds: string[], now = new Date()): Promise<void> {
    const at = now.toISOString();
    await this.db.batch([
      ...proverbIds.map((id) => ({
        sql: 'INSERT OR IGNORE INTO user.progress (proverb_id, completed_at) VALUES (?, ?)',
        bind: [id, at],
      })),
      { sql: 'INSERT OR IGNORE INTO user.study_days (day) VALUES (?)', bind: [localDay(now)] },
    ]);
    this.revision.update((n) => n + 1);
  }

  /** Marks proverbs as not completed (study days are kept). */
  async uncomplete(proverbIds: string[]): Promise<void> {
    await this.db.batch(
      proverbIds.map((id) => ({
        sql: 'DELETE FROM user.progress WHERE proverb_id = ?',
        bind: [id],
      })),
    );
    this.revision.update((n) => n + 1);
  }

  async exportBackup(now = new Date()): Promise<Backup> {
    const settings = (
      await this.db.query<{ key: string; value: string }>('SELECT key, value FROM user.settings')
    ).filter((s) => !PRIVATE_SETTINGS.has(s.key));
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exported_at: now.toISOString(),
      settings,
      progress: await this.db.query('SELECT proverb_id, completed_at FROM user.progress'),
      study_days: await this.db.query('SELECT day FROM user.study_days ORDER BY day'),
      bookmarks: await this.db.query('SELECT proverb_id, created_at FROM user.bookmarks'),
      notes: await this.db.query('SELECT proverb_id, body, updated_at FROM user.notes'),
      reviews: await this.db.query(
        'SELECT proverb_id, verdict, comment, fingerprint, updated_at FROM user.reviews',
      ),
    };
  }

  /** Merges a backup file into the user's data. Throws a readable message if the file is wrong. */
  async importBackup(text: string): Promise<Backup> {
    const backup = parseBackup(text);
    await this.db.batch(importStatements(backup));
    this.revision.update((n) => n + 1);
    return backup;
  }
}
