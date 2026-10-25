/**
 * Minimal type declarations for the vendored wa-sqlite build.
 *
 * wa-sqlite ships as plain JS. We only declare the surface we actually use in
 * `src/data/local`. See https://github.com/rhashimoto/wa-sqlite.
 *
 * Vendored from wa-sqlite v1.1.2 (MIT) into `src/vendor/wa-sqlite`.
 */

declare module "@/vendor/wa-sqlite/dist/wa-sqlite.mjs" {
  const SQLiteESMFactory: (options?: {
    locateFile?: (path: string, prefix: string) => string;
  }) => Promise<unknown>;
  export default SQLiteESMFactory;
}

declare module "@/vendor/wa-sqlite/src/sqlite-api.js" {
  /** Opaque Emscripten module instance. */
  export type SQLiteModule = unknown;

  /** Opaque database handle (integer pointer). */
  export type SQLiteDB = number;

  export interface SQLiteAPI {
    open_v2(
      filename: string,
      flags?: number,
      vfs?: string,
    ): Promise<SQLiteDB>;
    close(db: SQLiteDB): Promise<void>;
    exec(
      db: SQLiteDB,
      sql: string,
      callback?: (row: unknown[], columns: string[]) => void,
    ): Promise<void>;
    statements(
      db: SQLiteDB,
      sql: string,
      options?: { unscoped?: boolean; flags?: number },
    ): AsyncGenerator<number>;
    /** `index` is 1-based, matching SQLite parameter positions. */
    bind(stmt: number, index: number, value: unknown): number;
    /** Resolves to `SQLITE_ROW` while rows remain, then `SQLITE_DONE`. */
    step(stmt: number): Promise<number>;
    column_names(stmt: number): string[];
    row(stmt: number): unknown[];
    reset(stmt: number): Promise<number>;
    finalize(stmt: number): Promise<number>;
    changes(db: SQLiteDB): number;
    vfs_register(vfs: unknown, makeDefault?: boolean): void;
  }

  export function Factory(Module: SQLiteModule): SQLiteAPI;

  export const SQLITE_OK: number;
  export const SQLITE_ROW: number;
  export const SQLITE_DONE: number;
  export const SQLITE_OPEN_READONLY: number;
  export const SQLITE_OPEN_READWRITE: number;
  export const SQLITE_OPEN_CREATE: number;
  export const SQLITE_OPEN_URI: number;
}

declare module "@/vendor/wa-sqlite/src/examples/OPFSCoopSyncVFS.js" {
  import type { SQLiteModule } from "@/vendor/wa-sqlite/src/sqlite-api.js";

  export class OPFSCoopSyncVFS {
    static create(name: string, module: SQLiteModule): Promise<OPFSCoopSyncVFS>;
    readonly name: string;
  }
}

declare module "@/vendor/wa-sqlite/src/examples/IDBBatchAtomicVFS.js" {
  import type { SQLiteModule } from "@/vendor/wa-sqlite/src/sqlite-api.js";

  export class IDBBatchAtomicVFS {
    static create(
      name: string,
      module: SQLiteModule,
      options?: { durability?: "default" | "strict" | "relaxed" },
    ): Promise<IDBBatchAtomicVFS>;
    readonly name: string;
  }
}
