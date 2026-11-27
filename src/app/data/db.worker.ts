/// <reference lib="webworker" />
// Runs SQLite in a Web Worker.
//
// - content.db (lesson content) is downloaded, served from the service worker
//   cache when offline, and opened read-only in memory as "main".
// - user.db (the user's own data) lives in the browser's private file system
//   (OPFS) through the "opfs-sahpool" storage, which, unlike SQLite's default
//   OPFS storage, needs no special HTTP headers, so it works on GitHub Pages.
//   It is attached as "user".
import sqlite3InitModule, { type Database, type Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import type { DbInfo, DbRequest, DbResponse, SqlValue } from './db-protocol';
import { USER_MIGRATIONS } from './user-migrations';

const POOL_NAME = 'opfs-sahpool';
const POOL_DIRECTORY = '.worthy-words';
const USER_DB = '/user.db';

let db: Database | undefined;

async function open(contentUrl: string, wasmUrl: string): Promise<DbInfo> {
  const init = sqlite3InitModule as unknown as (options: {
    locateFile: (file: string) => string;
  }) => Promise<Sqlite3Static>;
  const sqlite3 = await init({ locateFile: () => wasmUrl });

  const response = await fetch(contentUrl);
  if (!response.ok) throw new Error(`Could not load lesson content (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());

  const database = new sqlite3.oo1.DB(':memory:', 'c');
  const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
  const { capi } = sqlite3;
  database.checkRc(
    capi.sqlite3_deserialize(
      database.pointer!,
      'main',
      pointer,
      bytes.byteLength,
      bytes.byteLength,
      capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_READONLY,
    ),
  );

  let storage: DbInfo['storage'] = 'temporary';
  let storageProblem: DbInfo['storageProblem'];
  try {
    await sqlite3.installOpfsSAHPoolVfs({ name: POOL_NAME, directory: POOL_DIRECTORY });
    database.exec(`ATTACH 'file:${USER_DB}?vfs=${POOL_NAME}' AS user`);
    storage = 'persistent';
  } catch (error) {
    // No OPFS (older browsers, some private windows), or another tab holds the
    // files. The app still works; the user's changes last until the page closes.
    storageProblem = (await opfsWorks()) && isLockError(error) ? 'in-use' : 'unsupported';
    console.warn('Worthy Words: saving is off for this tab:', String(error));
    database.exec(`ATTACH ':memory:' AS user`);
  }

  database.exec('PRAGMA foreign_keys = ON');
  const userSchemaVersion = migrate(database);
  db = database;

  const contentVersion = String(
    database.selectValue(`SELECT value FROM main.meta WHERE key = 'version'`) ?? '',
  );
  return {
    storage,
    storageProblem,
    sqliteVersion: sqlite3.version.libVersion,
    contentVersion,
    userSchemaVersion,
  };
}

async function opfsWorks(): Promise<boolean> {
  try {
    await navigator.storage.getDirectory();
    return true;
  } catch {
    return false;
  }
}

/** Another tab or window holds the database files. */
function isLockError(error: unknown): boolean {
  return /NoModificationAllowed|access handle|locked|busy/i.test(String(error));
}

function migrate(database: Database): number {
  let version = Number(database.selectValue('PRAGMA user.user_version') ?? 0);
  if (version > USER_MIGRATIONS.length) {
    throw new Error(
      `Your saved data is from a newer version of Worthy Words (${version}). Reload to update the app.`,
    );
  }
  while (version < USER_MIGRATIONS.length) {
    const next = version + 1;
    database.transaction((tx) => {
      tx.exec(USER_MIGRATIONS[version]);
      tx.exec(`PRAGMA user.user_version = ${next}`);
    });
    version = next;
  }
  return version;
}

function requireDb(): Database {
  if (!db) throw new Error('The database is not open yet');
  return db;
}

async function handle(request: DbRequest): Promise<unknown> {
  switch (request.method) {
    case 'open':
      if (db) throw new Error('The database is already open');
      return open(request.contentUrl, request.wasmUrl);
    case 'query':
      return requireDb().selectObjects(request.sql, request.bind as SqlValue[] | undefined);
    case 'exec': {
      const database = requireDb();
      database.exec({ sql: request.sql, bind: request.bind as SqlValue[] | undefined });
      return { changes: database.changes() };
    }
    case 'batch':
      // All or nothing: one transaction for every statement.
      requireDb().transaction((tx) => {
        for (const { sql, bind } of request.statements) {
          tx.exec({ sql, bind: bind as SqlValue[] | undefined });
        }
      });
      return null;
  }
}

addEventListener('message', async ({ data }: MessageEvent<DbRequest>) => {
  let response: DbResponse;
  try {
    response = { id: data.id, ok: true, result: await handle(data) };
  } catch (error) {
    response = {
      id: data.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  postMessage(response);
});
