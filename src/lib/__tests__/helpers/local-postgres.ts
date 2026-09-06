import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

// Test-only bridge. Never loads .env or DATABASE_URL; the target is an isolated
// loopback cluster with a dedicated database/user, not the application's DB.
export const POSTGRES_TEST_ENABLED = process.env.SHOWLE_SECURITY_PG_TEST === "1";
function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("number"); return String(value); }
  if (Array.isArray(value)) return `ARRAY[${value.map(literal).join(",")}]::text[]`;
  return `'${String(value).replaceAll("'", "''")}'`;
}
function statement(query: TemplateStringsArray | Prisma.Sql, values: unknown[]) {
  const strings = Array.isArray(query) ? query : (query as Prisma.Sql).strings;
  const parameters = Array.isArray(query) ? values : (query as Prisma.Sql).values;
  return strings.map((part, i) => part + (i < parameters.length ? literal(parameters[i]) : "")).join("");
}

export class LocalPostgres {
  private child;
  private buffer = "";
  private errors = "";
  private pending?: { marker: string; resolve: (text: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
  constructor() {
    if (!POSTGRES_TEST_ENABLED || !process.env.SHOWLE_SECURITY_PSQL) throw new Error("Explicit local PG test configuration required");
    this.child = spawn(process.env.SHOWLE_SECURITY_PSQL, ["-X", "-qAt", "-v", "ON_ERROR_STOP=1",
      "-h", "127.0.0.1", "-p", "55439", "-U", "showle_security", "-d", "showle_security_fix"], {
      windowsHide: true, stdio: "pipe",
    });
    this.child.stdout.on("data", (chunk) => {
      this.buffer += chunk.toString();
      const pending = this.pending;
      if (!pending) return;
      const end = this.buffer.indexOf(pending.marker);
      if (end < 0) return;
      const output = this.buffer.slice(0, end).trim();
      this.buffer = this.buffer.slice(end + pending.marker.length).trimStart();
      clearTimeout(pending.timer); this.pending = undefined; pending.resolve(output);
    });
    this.child.stderr.on("data", (chunk) => { this.errors += chunk.toString(); });
    const fail = (error: Error) => {
      if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(error); this.pending = undefined; }
    };
    this.child.on("error", fail);
    this.child.on("close", (code) => fail(new Error(`Local psql exited ${code}: ${this.errors}`)));
  }
  query(sql: string): Promise<string> {
    if (this.pending) throw new Error("Only sequential statements per transaction");
    return new Promise((resolve, reject) => {
      const marker = `end_${randomUUID().replaceAll("-", "")}`;
      const timer = setTimeout(() => { this.child.kill(); reject(new Error("Local PG test timeout")); }, 10000);
      this.pending = { marker, resolve, reject, timer };
      this.child.stdin.write(`${sql};\n\\echo ${marker}\n`);
    });
  }
  async rows(sql: string) {
    return JSON.parse(await this.query(`SELECT coalesce(json_agg(result), '[]'::json) FROM (${sql}) AS result`)) as Record<string, unknown>[];
  }
  async close() {
    this.child.stdin.end();
    if (this.child.exitCode === null) await new Promise<void>((resolve) => this.child.once("close", () => resolve()));
  }
  adapter() {
    return {
      $executeRaw: (query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]) => this.query(statement(query, values)),
      $queryRaw: (query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]) => this.rows(statement(query, values)),
      dailyUsage: {
        findUnique: async ({ where }: { where: { key: string } }) => (await this.rows(`SELECT * FROM "DailyUsage" WHERE key = ${literal(where.key)}`))[0] ?? null,
        upsert: async ({ where, create }: { where: { key: string }; create: { date: string } }) => {
          const result = await this.query(`INSERT INTO "DailyUsage" (key, count, date) VALUES (${literal(where.key)}, 1, ${literal(create.date)})
            ON CONFLICT (key) DO UPDATE SET count = "DailyUsage".count + 1 RETURNING row_to_json("DailyUsage")`);
          return JSON.parse(result);
        },
      },
      rankedList: {
        findUnique: async ({ where }: { where: { id: string } }) => (await this.rows(`SELECT * FROM "RankedList" WHERE id = ${literal(where.id)}`))[0] ?? null,
      },
      rankedListItem: {
        findMany: ({ where, orderBy }: { where: { listId: string; id?: { in: string[] } }; orderBy?: { position: string } }) =>
          this.rows(`SELECT * FROM "RankedListItem" WHERE "listId" = ${literal(where.listId)}
            ${where.id ? `AND id IN (${where.id.in.map(literal).join(",")})` : ""} ORDER BY position ${orderBy?.position === "desc" ? "DESC" : "ASC"}`),
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const columns = Object.keys(data).map((key) => `"${key}"`).join(",");
          return JSON.parse(await this.query(`INSERT INTO "RankedListItem" (${columns}) VALUES (${Object.values(data).map(literal).join(",")}) RETURNING row_to_json("RankedListItem")`));
        },
      },
    };
  }
}

export async function postgresTransaction<T>(callback: (tx: ReturnType<LocalPostgres["adapter"]>) => Promise<T>) {
  const connection = new LocalPostgres();
  try {
    await connection.query("BEGIN; SET LOCAL statement_timeout = '5s'; SET LOCAL lock_timeout = '5s'");
    const result = await callback(connection.adapter());
    await connection.query("COMMIT");
    return result;
  } catch (error) {
    await connection.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { await connection.close(); }
}
