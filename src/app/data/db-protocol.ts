// Messages between DbService (main thread) and the database worker.

export type SqlValue = string | number | null | Uint8Array;
export type Row = Record<string, SqlValue>;

/**
 * Where the user's data lives:
 * - "persistent": saved in the browser (OPFS) and kept between visits.
 * - "temporary": kept in memory only, lost when the page closes. Happens when
 *   the browser has no OPFS, or another tab already has the database open.
 */
export type StorageKind = 'persistent' | 'temporary';

export interface DbInfo {
  storage: StorageKind;
  /** Why storage is temporary, for showing to the user. */
  storageProblem?: 'unsupported' | 'in-use';
  sqliteVersion: string;
  contentVersion: string;
  userSchemaVersion: number;
}

export type DbRequest =
  | { id: number; method: 'open'; contentUrl: string; wasmUrl: string }
  | { id: number; method: 'query'; sql: string; bind?: SqlValue[] }
  | { id: number; method: 'exec'; sql: string; bind?: SqlValue[] }
  | { id: number; method: 'batch'; statements: Statement[] };

/** One SQL statement and its values. */
export interface Statement {
  sql: string;
  bind?: SqlValue[];
}

export type DbResponse =
  { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };
