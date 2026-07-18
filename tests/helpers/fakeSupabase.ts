/* eslint-disable @typescript-eslint/no-explicit-any */
// A small in-memory stand-in for the Supabase service-role client. It behaves
// like the subset of the postgrest query builder the webhook/checkout code
// needs (insert / upsert / update / delete / select / eq / maybeSingle /
// single), so tests can assert on final table STATE rather than on an exact
// sequence of calls — which keeps the tests implementation-agnostic.
//
// This is TEST SCAFFOLDING ONLY. It contains no product logic and reveals no
// solution to the drill files.

import type { ServiceClient } from "@/lib/supabase/service";

type Row = Record<string, any>;
type Tables = Record<string, Row[]>;

const PRIMARY_KEY: Record<string, string> = {
  billing_customers: "user_id",
  subscriptions: "id",
  stripe_events: "id",
};

function applyDefaults(table: string, row: Row): Row {
  const now = new Date().toISOString();
  const withDefaults: Row = { ...row };
  if (table === "stripe_events") {
    if (withDefaults.status === undefined) withDefaults.status = "received";
    if (withDefaults.received_at === undefined) withDefaults.received_at = now;
  }
  if (table === "billing_customers") {
    if (withDefaults.created_at === undefined) withDefaults.created_at = now;
  }
  if (table === "subscriptions") {
    if (withDefaults.cancel_at_period_end === undefined) withDefaults.cancel_at_period_end = false;
    if (withDefaults.created_at === undefined) withDefaults.created_at = now;
    if (withDefaults.updated_at === undefined) withDefaults.updated_at = now;
  }
  return withDefaults;
}

type Op = "select" | "insert" | "upsert" | "update" | "delete";

class Builder implements PromiseLike<{ data: any; error: any }> {
  private op: Op = "select";
  private payload: Row[] = [];
  private opts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private patch: Row = {};
  private filters: { col: string; val: unknown }[] = [];
  private singleMode: "none" | "single" | "maybe" = "none";
  private ran = false;

  constructor(
    private readonly tables: Tables,
    private readonly table: string,
  ) {}

  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  upsert(rows: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.opts = opts ?? {};
    return this;
  }

  update(patch: Row) {
    this.op = "update";
    this.patch = patch;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  select(_cols?: string) {
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, val });
    return this;
  }

  order(_col: string, _opts?: unknown) {
    return this;
  }

  limit(_n: number) {
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  private store(): Row[] {
    if (!this.tables[this.table]) this.tables[this.table] = [];
    return this.tables[this.table];
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => row[f.col] === f.val);
  }

  private run(): { data: any; error: any } {
    const pk = PRIMARY_KEY[this.table];
    const rows = this.store();
    let affected: Row[] = [];

    if (this.op === "insert") {
      for (const raw of this.payload) {
        const row = applyDefaults(this.table, raw);
        if (rows.some((r) => r[pk] === row[pk])) {
          return { data: null, error: { code: "23505", message: "duplicate key value" } };
        }
        rows.push(row);
        affected.push(row);
      }
    } else if (this.op === "upsert") {
      for (const raw of this.payload) {
        const row = applyDefaults(this.table, raw);
        const idx = rows.findIndex((r) => r[pk] === row[pk]);
        if (idx >= 0) {
          if (this.opts.ignoreDuplicates) continue; // ON CONFLICT DO NOTHING
          rows[idx] = { ...rows[idx], ...row };
          affected.push(rows[idx]);
        } else {
          rows.push(row);
          affected.push(row);
        }
      }
    } else if (this.op === "update") {
      for (const row of rows) {
        if (this.matches(row)) {
          Object.assign(row, this.patch);
          affected.push(row);
        }
      }
    } else if (this.op === "delete") {
      const kept: Row[] = [];
      for (const row of rows) {
        if (this.matches(row)) affected.push(row);
        else kept.push(row);
      }
      this.tables[this.table] = kept;
    } else {
      affected = rows.filter((row) => this.matches(row));
    }

    if (this.singleMode === "single") {
      if (affected.length !== 1) {
        return { data: null, error: { code: "PGRST116", message: "no single row" } };
      }
      return { data: affected[0], error: null };
    }
    if (this.singleMode === "maybe") {
      return { data: affected[0] ?? null, error: null };
    }
    return { data: affected, error: null };
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    if (this.ran) throw new Error("query builder awaited twice");
    this.ran = true;
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

export class FakeDb {
  readonly tables: Tables = {
    billing_customers: [],
    subscriptions: [],
    stripe_events: [],
  };

  from(table: string): Builder {
    return new Builder(this.tables, table);
  }

  /** Seed rows directly (bypasses defaults for full control). */
  seed(table: keyof FakeDb["tables"], rows: Row[]): void {
    this.tables[table].push(...rows);
  }

  /** The typed client the code-under-test consumes. */
  get client(): ServiceClient {
    return this as unknown as ServiceClient;
  }
}

let active = new FakeDb();

export function resetDb(): FakeDb {
  active = new FakeDb();
  return active;
}

export function activeDb(): FakeDb {
  return active;
}

/** Drop-in for `createServiceClient` from the real module (see vi.mock). */
export function createServiceClient(): ServiceClient {
  return active.client;
}
