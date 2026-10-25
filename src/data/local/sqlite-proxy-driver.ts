/**
 * Drizzle driver over the wa-sqlite worker client (`sqlite-client.ts`).
 *
 * Drizzle's `sqlite-proxy` calls a callback with `(sql, params, method)`:
 *  - `run`    → execute a statement, ignore rows
 *  - `get`    → one row, as an object keyed by column name
 *  - `all`    → many rows, as objects keyed by column name
 *  - `values` → rows as positional arrays
 *
 * wa-sqlite has no first-party Drizzle driver, so this thin adapter is the
 * bridge. It is intentionally the only place that knows about both Drizzle's
 * callback contract and our worker client.
 */

import { drizzle } from "drizzle-orm/sqlite-proxy";
import { sqliteClient } from "./sqlite-client";

export type ProxyMethod = "run" | "all" | "values" | "get";

export interface AsyncRemoteCallbackResult {
  rows: unknown[];
}

async function remoteCallback(
  sql: string,
  params: unknown[],
  method: ProxyMethod,
): Promise<AsyncRemoteCallbackResult> {
  if (method === "run") {
    await sqliteClient.exec(sql, params);
    return { rows: [] };
  }

  const rows = await sqliteClient.query(sql, params);

  // Drizzle's `mapResultRow` reads values positionally (`row[columnIndex]`), so
  // every method must return positionally-ordered arrays. The worker returns
  // objects keyed by column name, so we drop the keys here.
  return { rows: rows.map((row) => Object.values(row)) };
}

export const localDb = drizzle(remoteCallback);
