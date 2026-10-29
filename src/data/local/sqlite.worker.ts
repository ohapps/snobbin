/**
 * wa-sqlite runs inside this dedicated Web Worker so SQLite's synchronous OPFS
 * access never blocks the UI thread.
 *
 * Protocol: the main thread posts `SqliteRequest` messages; the worker replies
 * with `SqliteResponse`. See `src/data/local/sqlite-client.ts`.
 *
 * Vendored wa-sqlite v1.1.2 (MIT). Do not add app logic here beyond transport +
 * SQL execution.
 */

import SQLiteESMFactory from "@/vendor/wa-sqlite/dist/wa-sqlite.mjs";
import * as SQLite from "@/vendor/wa-sqlite/src/sqlite-api.js";
import { OPFSCoopSyncVFS } from "@/vendor/wa-sqlite/src/examples/OPFSCoopSyncVFS.js";
import { IDBBatchAtomicVFS } from "@/vendor/wa-sqlite/src/examples/IDBBatchAtomicVFS.js";

export interface SqliteRequest {
  id: number;
  type: "init" | "exec" | "query";
  /** For `init` this is the database file name; otherwise the SQL to run. */
  sql: string;
  /** Values bound to `?`/`:name` placeholders in `sql` (1-based order). */
  params?: unknown[];
}

export interface SqliteResponse {
  id: number;
  ok: boolean;
  /** Rows for `query` (array of column-name → value objects). */
  rows?: Record<string, unknown>[];
  /** Rows affected / last insert id for `exec`. */
  changes?: number;
  lastInsertRowid?: number;
  error?: string;
  /** Which VFS was actually used, populated after `init`. */
  vfs?: string;
}

const VFS_NAME = "opfs-coop";
const VFS_FALLBACK = "idb-batch";
const SQLITE_WORKER_VERSION = "20251029-verbose-v2";

let sqlite3: SQLite.SQLiteAPI | null = null;
let db: SQLite.SQLiteDB | null = null;
let activeVfsName: string | null = null;

function requireApi(): { api: SQLite.SQLiteAPI; handle: SQLite.SQLiteDB } {
  if (!sqlite3 || db === null) {
    throw new Error("SQLite worker not initialized");
  }
  return { api: sqlite3, handle: db };
}

/**
 * wa-sqlite's `bind(stmt, index, value)` takes a 1-based parameter index, so
 * bind each value individually.
 */
function bindAll(
  api: SQLite.SQLiteAPI,
  stmt: number,
  params: unknown[],
): void {
  params.forEach((value, i) => {
    api.bind(stmt, i + 1, value);
  });
}

async function init(databaseName: string): Promise<string> {
  if (db !== null) {
    return activeVfsName ?? VFS_NAME;
  }

  const wasmModule = await SQLiteESMFactory();

  let vfs: unknown;
  let vfsName: string;

  const forceVfs =
    typeof process !== "undefined" &&
    (process.env as Record<string, string | undefined>).NEXT_PUBLIC_OFFLINE_FORCE_VFS;
  const isolated =
    typeof self !== "undefined" &&
    "crossOriginIsolated" in self &&
    (self as Window & { crossOriginIsolated?: boolean }).crossOriginIsolated ===
      true;

  console.log(
    "[sqlite.worker]",
    SQLITE_WORKER_VERSION,
    "isolated:",
    isolated,
    "forceVfs:",
    forceVfs,
    "location:",
    typeof location !== "undefined" ? location.href : undefined,
  );

  if (forceVfs === "idb") {
    try {
      vfs = await IDBBatchAtomicVFS.create(databaseName, wasmModule);
      vfsName = VFS_FALLBACK;
      console.log("[sqlite.worker] forced IDB VFS");
    } catch (error) {
      console.error("[sqlite.worker] forced IDB VFS failed:", error);
      throw error;
    }
  } else if (!isolated) {
    try {
      vfs = await IDBBatchAtomicVFS.create(databaseName, wasmModule);
      vfsName = VFS_FALLBACK;
      console.log("[sqlite.worker] using IDB VFS");
    } catch (error) {
      console.warn("[sqlite.worker] IDB VFS failed, trying OPFS as last resort:", error);
      try {
        vfs = await OPFSCoopSyncVFS.create(VFS_NAME, wasmModule);
        vfsName = VFS_NAME;
        console.log("[sqlite.worker] using OPFS VFS (last resort)");
      } catch (err) {
        console.error("[sqlite.worker] Both VFSes failed:", err);
        throw err;
      }
    }
  } else {
    try {
      vfs = await OPFSCoopSyncVFS.create(VFS_NAME, wasmModule);
      vfsName = VFS_NAME;
      console.log("[sqlite.worker] using OPFS VFS");
    } catch (error) {
      console.warn("[sqlite.worker] OPFS failed, falling back to IndexedDB VFS:", error);
      try {
        vfs = await IDBBatchAtomicVFS.create(databaseName, wasmModule);
        vfsName = VFS_FALLBACK;
        console.log("[sqlite.worker] using IDB VFS (fallback)");
      } catch (err) {
        console.error("[sqlite.worker] OPFS failed and IDB fallback failed:", err);
        throw err;
      }
    }
  }

  sqlite3 = SQLite.Factory(wasmModule);
  sqlite3.vfs_register(vfs as never, true);
  activeVfsName = vfsName;

  try {
    db = await sqlite3.open_v2(
      databaseName,
      SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE,
      vfsName,
    );
  } catch (error) {
    const code = (error as { code?: number }).code;
    const cause = (vfs as { lastError?: unknown }).lastError;
    const causeText =
      cause instanceof Error
        ? `${cause.name}: ${cause.message}`
        : cause
          ? String(cause)
          : "";
    const errorText = error instanceof Error ? error.message : String(error);
    const vfsErr = (vfs as { lastError?: unknown })?.lastError;
    const vfsErrText =
      vfsErr instanceof Error ? `${vfsErr.name}: ${vfsErr.message}` : vfsErr ? String(vfsErr) : "";
    const vfsJ = vfs as { jGetLastError?: (buf: Uint8Array) => number };
    const vfsExtra =
      typeof vfsJ?.jGetLastError === "function"
        ? (() => {
            try {
              const buf = new Uint8Array(256);
              vfsJ.jGetLastError(buf);
              const s = new TextDecoder().decode(buf).replace(/\0.*$/, "");
              return s;
            } catch {
              return "";
            }
          })()
        : "";
    throw new Error(
      `sqlite3_open_v2 failed (code ${code ?? "?"}, vfs ${vfsName}): ${errorText}${
        causeText ? ` — ${causeText}` : ""
      }${vfsErrText ? ` | vfs.lastError: ${vfsErrText}` : ""}${
        vfsExtra ? ` | vfsErr: ${vfsExtra}` : ""
      }`,
    );
  }

  await sqlite3.exec(db, "PRAGMA journal_mode = WAL;");
  await sqlite3.exec(db, "PRAGMA foreign_keys = ON;");
  await sqlite3.exec(db, "PRAGMA synchronous = NORMAL;");

  return vfsName;
}

async function execSql(sql: string, params: unknown[] = []) {
  const { api, handle } = requireApi();

  if (params.length === 0) {
    await api.exec(handle, sql);
  } else {
    // `statements()` auto-finalizes each statement after the loop body yields
    // unless we pass `unscoped`. Default scoping (auto-finalize on next
    // iteration) is what we want here.
    for await (const stmt of api.statements(handle, sql)) {
      bindAll(api, stmt, params);
      await api.step(stmt);
    }
  }

  // wa-sqlite exposes `changes()` but not `last_insert_rowid()`. The offline
  // mirror never needs the inserted row id (ids come from the server), so we
  // only report `changes`.
  return { changes: api.changes(handle) };
}

async function querySql(
  sql: string,
  params: unknown[] = [],
): Promise<Record<string, unknown>[]> {
  const { api, handle } = requireApi();
  const rows: Record<string, unknown>[] = [];

  for await (const stmt of api.statements(handle, sql)) {
    if (params.length > 0) {
      bindAll(api, stmt, params);
    }

    // SQLite does not know a statement's column names until it has been stepped
    // at least once, so read them lazily on the first row.
    let columns: string[] | null = null;
    while ((await api.step(stmt)) === SQLite.SQLITE_ROW) {
      columns = columns ?? api.column_names(stmt);
      const raw = api.row(stmt);
      const row: Record<string, unknown> = {};
      columns.forEach((name, index) => {
        row[name] = raw[index];
      });
      rows.push(row);
    }
  }

  return rows;
}

self.onmessage = async (event: MessageEvent<SqliteRequest>) => {
  const { id, type, sql, params } = event.data;

  try {
    if (type === "init") {
      const vfs = await init(sql);
      self.postMessage({ id, ok: true, vfs } satisfies SqliteResponse);
      return;
    }

    if (type === "exec") {
      const result = await execSql(sql, params);
      self.postMessage({ id, ok: true, ...result } satisfies SqliteResponse);
      return;
    }

    const rows = await querySql(sql, params);
    self.postMessage({ id, ok: true, rows } satisfies SqliteResponse);
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies SqliteResponse);
  }
};
