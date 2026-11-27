// The user's own data as a JSON file, for keeping a copy or moving to another
// browser or device. Importing merges: nothing already saved is lost.
import type { Statement } from './db-protocol';

export const BACKUP_FORMAT = 'worthy-words-backup';
export const BACKUP_VERSION = 1;

/** Settings that never leave the device (the user's own API key, Phase 3). */
export const PRIVATE_SETTINGS = new Set(['anthropic_api_key']);

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exported_at: string;
  settings: { key: string; value: string }[];
  progress: { proverb_id: string; completed_at: string }[];
  study_days: { day: string }[];
  bookmarks: { proverb_id: string; created_at: string }[];
  notes: { proverb_id: string; body: string; updated_at: string }[];
}

type Shape = Record<string, 'string'>;
const TABLES: Record<Exclude<keyof Backup, 'format' | 'version' | 'exported_at'>, Shape> = {
  settings: { key: 'string', value: 'string' },
  progress: { proverb_id: 'string', completed_at: 'string' },
  study_days: { day: 'string' },
  bookmarks: { proverb_id: 'string', created_at: 'string' },
  notes: { proverb_id: 'string', body: 'string', updated_at: 'string' },
};

/** Checks a parsed file is a backup this version can read. Throws a readable message if not. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file isn’t a Worthy Words backup (it isn’t JSON).');
  }
  const record = data as Partial<Backup> | null;
  if (!record || typeof record !== 'object' || record.format !== BACKUP_FORMAT) {
    throw new Error('This file isn’t a Worthy Words backup.');
  }
  if (typeof record.version !== 'number' || record.version > BACKUP_VERSION) {
    throw new Error(
      'This backup is from a newer version of Worthy Words. Reload to update the app.',
    );
  }
  for (const [table, shape] of Object.entries(TABLES)) {
    const rows = (record as Record<string, unknown>)[table] ?? [];
    if (!Array.isArray(rows)) throw new Error(`The backup’s “${table}” isn’t a list.`);
    for (const row of rows) {
      const ok =
        row &&
        typeof row === 'object' &&
        Object.entries(shape).every(([column, type]) => typeof row[column] === type);
      if (!ok) throw new Error(`The backup has a damaged “${table}” entry.`);
    }
    (record as Record<string, unknown>)[table] = rows;
  }
  return record as Backup;
}

/** SQL that merges a backup into the user database. */
export function importStatements(backup: Backup): Statement[] {
  const statements: Statement[] = [];
  for (const { key, value } of backup.settings) {
    if (PRIVATE_SETTINGS.has(key)) continue;
    statements.push({
      sql: 'INSERT INTO user.settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
      bind: [key, value],
    });
  }
  for (const { proverb_id, completed_at } of backup.progress) {
    // Keep the earlier completion date.
    statements.push({
      sql: `INSERT INTO user.progress (proverb_id, completed_at) VALUES (?, ?)
            ON CONFLICT (proverb_id) DO UPDATE SET completed_at = min(completed_at, excluded.completed_at)`,
      bind: [proverb_id, completed_at],
    });
  }
  for (const { day } of backup.study_days) {
    statements.push({ sql: 'INSERT OR IGNORE INTO user.study_days (day) VALUES (?)', bind: [day] });
  }
  for (const { proverb_id, created_at } of backup.bookmarks) {
    statements.push({
      sql: 'INSERT OR IGNORE INTO user.bookmarks (proverb_id, created_at) VALUES (?, ?)',
      bind: [proverb_id, created_at],
    });
  }
  for (const { proverb_id, body, updated_at } of backup.notes) {
    // Keep whichever version of a note was edited last.
    statements.push({
      sql: `INSERT INTO user.notes (proverb_id, body, updated_at) VALUES (?, ?, ?)
            ON CONFLICT (proverb_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at
            WHERE excluded.updated_at > notes.updated_at`,
      bind: [proverb_id, body, updated_at],
    });
  }
  return statements;
}
