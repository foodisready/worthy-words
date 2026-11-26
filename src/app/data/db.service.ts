import { Injectable, signal } from '@angular/core';
import type { DbInfo, DbRequest, DbResponse, Row, SqlValue } from './db-protocol';

type Pending = { resolve: (value: unknown) => void; reject: (reason: Error) => void };
type Request = DbRequest extends infer R
  ? R extends { id: number }
    ? Omit<R, 'id'>
    : never
  : never;

/** Talks to the SQLite worker. Every call waits until the database is open. */
@Injectable({ providedIn: 'root' })
export class DbService {
  /** Set once the database is open. */
  readonly info = signal<DbInfo | undefined>(undefined);
  /** Set if the database could not be opened. */
  readonly error = signal<string | undefined>(undefined);

  private worker?: Worker;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private opened?: Promise<DbInfo>;

  /** Opens the database. Safe to call more than once. */
  open(): Promise<DbInfo> {
    this.opened ??= this.start();
    return this.opened;
  }

  async query<T = Row>(sql: string, bind?: SqlValue[]): Promise<T[]> {
    await this.open();
    return (await this.send({ method: 'query', sql, bind })) as T[];
  }

  async exec(sql: string, bind?: SqlValue[]): Promise<{ changes: number }> {
    await this.open();
    return (await this.send({ method: 'exec', sql, bind })) as { changes: number };
  }

  private async start(): Promise<DbInfo> {
    try {
      this.worker = new Worker(new URL('./db.worker', import.meta.url), { type: 'module' });
      this.worker.addEventListener('message', ({ data }: MessageEvent<DbResponse>) => {
        const pending = this.pending.get(data.id);
        if (!pending) return;
        this.pending.delete(data.id);
        if (data.ok) pending.resolve(data.result);
        else pending.reject(new Error(data.error));
      });
      // Relative to <base href>, so it works under /worthy-words/ on GitHub Pages.
      const base = document.baseURI;
      const info = (await this.send({
        method: 'open',
        contentUrl: new URL('data/content.db', base).href,
        wasmUrl: new URL('sqlite/sqlite3.wasm', base).href,
      })) as DbInfo;
      this.info.set(info);
      if (info.storage === 'persistent') void navigator.storage?.persist?.();
      return info;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error.set(message);
      throw error;
    }
  }

  private send(request: Request): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ ...request, id } as DbRequest);
    });
  }
}
