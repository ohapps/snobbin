/**
 * Main-thread client for the wa-sqlite worker.
 *
 * Owns a single worker instance, multiplexes requests by id, and exposes two
 * primitives that the Drizzle proxy driver builds on:
 *
 *  - `exec(sql, params)`  → { changes, lastInsertRowid }
 *  - `query(sql, params)` → rows
 *
 * Lazily initialized: the worker + OPFS database are only created on first use,
 * so pages that never touch offline data pay nothing.
 */

import { getOfflineDbName } from "./identity";
import type { SqliteRequest, SqliteResponse } from "./sqlite.worker";

export interface SqliteExecResult {
  changes: number;
  lastInsertRowid: number;
}

interface Pending {
  resolve: (value: SqliteResponse) => void;
  reject: (reason: Error) => void;
}

class SqliteClient {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private initPromise: Promise<void> | null = null;
  private vfs: string | null = null;
  private dbName: string | null = null;

  /** True once a worker has been created and successfully initialized. */
  get isReady(): boolean {
    return this.initPromise !== null && this.vfs !== null;
  }

  get vfsName(): string | null {
    return this.vfs;
  }

  /**
   * Opens the mirror for the currently remembered user. Pass `name` to target a
   * specific database file (used when wiping the previous user's mirror).
   */
  init(name?: string): Promise<void> {
    const target = name ?? getOfflineDbName();

    if (this.initPromise && this.dbName === target) return this.initPromise;

    // A different identity/file was requested: drop the open worker first.
    if (this.initPromise) this.reset();

    this.dbName = target;

    this.initPromise = (async () => {
      if (typeof Worker === "undefined") {
        throw new Error("Web Workers are not available in this environment");
      }

      const worker = new Worker(
        new URL("./sqlite.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker = worker;

      worker.onmessage = (event: MessageEvent<SqliteResponse>) => {
        const pending = this.pending.get(event.data.id);
        if (!pending) return;
        this.pending.delete(event.data.id);
        if (event.data.ok) {
          pending.resolve(event.data);
        } else {
          console.error("[sqlite-client] worker error:", event.data.error);
          pending.reject(new Error(event.data.error ?? "SQLite error"));
        }
      };

      worker.onerror = (event) => {
        console.error("[sqlite-client] worker onerror:", event.message, event.error);
        const error = new Error(event.message || "SQLite worker crashed");
        for (const item of Array.from(this.pending.values())) {
          item.reject(error);
        }
        this.pending.clear();
      };

      const response = await this.send({ type: "init", sql: target });
      this.vfs = response.vfs ?? "unknown";
    })();

    // Allow a later retry if initialization failed.
    this.initPromise.catch(() => {
      if (this.initPromise) this.reset();
    });

    return this.initPromise;
  }

  /** Tears down the worker and forgets all state. Safe to call repeatedly. */
  reset(): void {
    const error = new Error("SQLite client reset");
    for (const item of Array.from(this.pending.values())) item.reject(error);
    this.pending.clear();

    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
    this.vfs = null;
    this.dbName = null;
  }

  async exec(sql: string, params: unknown[] = []): Promise<SqliteExecResult> {
    await this.init();
    const response = await this.send({ type: "exec", sql, params });
    return {
      changes: response.changes ?? 0,
      lastInsertRowid: response.lastInsertRowid ?? 0,
    };
  }

  async query(
    sql: string,
    params: unknown[] = [],
  ): Promise<Record<string, unknown>[]> {
    await this.init();
    const response = await this.send({ type: "query", sql, params });
    return response.rows ?? [];
  }

  private send(request: Omit<SqliteRequest, "id">): Promise<SqliteResponse> {
    const worker = this.worker;
    if (!worker) {
      return Promise.reject(new Error("SQLite worker not started"));
    }

    const id = this.nextId++;
    return new Promise<SqliteResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ ...request, id } satisfies SqliteRequest);
    });
  }
}

/** Singleton client. Import this rather than constructing your own. */
export const sqliteClient = new SqliteClient();
