import { Injectable, inject, signal } from '@angular/core';
import { DbService } from './db.service';
import type { ReviewEntry, Verdict } from './review';

/** The reviewer's verdicts, kept in user.reviews. */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly db = inject(DbService);
  /** Changes whenever a verdict is saved, so pages can reload. */
  readonly revision = signal(0);

  all(): Promise<ReviewEntry[]> {
    return this.db.query<ReviewEntry>(
      'SELECT proverb_id, verdict, comment, fingerprint, updated_at FROM user.reviews',
    );
  }

  async save(proverbId: string, verdict: Verdict, comment: string, fingerprint: string) {
    await this.db.exec(
      `INSERT INTO user.reviews (proverb_id, verdict, comment, fingerprint, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (proverb_id) DO UPDATE SET verdict = excluded.verdict,
         comment = excluded.comment, fingerprint = excluded.fingerprint,
         updated_at = excluded.updated_at`,
      [proverbId, verdict, comment, fingerprint, new Date().toISOString()],
    );
    this.revision.update((n) => n + 1);
  }

  async clear(proverbId: string) {
    await this.db.exec('DELETE FROM user.reviews WHERE proverb_id = ?', [proverbId]);
    this.revision.update((n) => n + 1);
  }
}
