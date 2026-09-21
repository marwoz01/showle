import { randomUUID } from "node:crypto";
import { Prisma, type MovieChoiceRoom } from "@prisma/client";
import { LocalPostgres } from "@/lib/__tests__/helpers/local-postgres";

// This adapter only replaces Prisma's transport in persistence tests. Every
// statement and advisory lock goes to the opt-in loopback psql harness.
export const movieChoiceTestSchema = `movie_choice_it_${randomUUID().replaceAll("-", "")}`;
export const movieChoiceBackendPids = new Set<number>();

interface Where {
  code: string;
  expiresAt?: { gt: Date };
  OR?: { hostId?: string; guestId?: string }[];
}
type RecordData = Record<string, unknown>;

const jsonColumns = new Set(["hostPreferences", "guestPreferences", "hostVotes", "guestVotes", "movies"]);
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const identifier = (value: string) => {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) throw new Error("Unexpected test SQL identifier");
  return `"${value}"`;
};

function valueSql(key: string, value: unknown): string {
  if (jsonColumns.has(key)) return `${quote(JSON.stringify(value === Prisma.JsonNull ? null : value))}::jsonb`;
  if (value === null) return "NULL";
  if (value instanceof Date) return `${quote(value.toISOString())}::timestamp`;
  if (Array.isArray(value)) {
    if (key !== "excludedMovieIds" || value.some((item) => !Number.isSafeInteger(item))) throw new Error("Unexpected array");
    return `ARRAY[${value.join(",")}]::integer[]`;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return quote(value);
  throw new Error(`Unsupported MovieChoiceRoom test field: ${key}`);
}

function whereSql(where: Where): string {
  const filters = [`"code" = ${quote(where.code)}`];
  if (where.expiresAt) filters.push(`"expiresAt" > ${valueSql("expiresAt", where.expiresAt.gt)}`);
  if (where.OR) {
    filters.push(`(${where.OR.map((member) => {
      if (member.hostId !== undefined) return `"hostId" = ${quote(member.hostId)}`;
      if (member.guestId !== undefined) return `"guestId" = ${quote(member.guestId)}`;
      throw new Error("Unexpected membership predicate");
    }).join(" OR ")})`);
  }
  return filters.join(" AND ");
}

function hydrate(row: RecordData): MovieChoiceRoom {
  for (const key of ["createdAt", "updatedAt", "expiresAt", "generationStartedAt"]) {
    const value = row[key];
    if (typeof value === "string") row[key] = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
  }
  return row as unknown as MovieChoiceRoom;
}

function roomDelegate(pg: LocalPostgres) {
  const find = async ({ where, select }: { where: Where; select?: { code: boolean } }) => {
    const rows = await pg.rows(`SELECT ${select?.code ? '"code"' : "*"} FROM "MovieChoiceRoom" WHERE ${whereSql(where)} LIMIT 1`);
    return rows[0] ? hydrate(rows[0]) : null;
  };
  return {
    findFirst: find,
    findUnique: find,
    create: async ({ data }: { data: RecordData }) => {
      const entries = Object.entries({ ...data, updatedAt: new Date() });
      const output = await pg.query(`INSERT INTO "MovieChoiceRoom" (${entries.map(([key]) => identifier(key)).join(",")})
        VALUES (${entries.map(([key, value]) => valueSql(key, value)).join(",")}) RETURNING row_to_json("MovieChoiceRoom")`);
      return hydrate(JSON.parse(output));
    },
    update: async ({ where, data }: { where: Where; data: RecordData }) => {
      const entries = Object.entries({ ...data, updatedAt: new Date() }).filter(([, value]) => value !== undefined);
      const output = await pg.query(`UPDATE "MovieChoiceRoom" SET
        ${entries.map(([key, value]) => `${identifier(key)} = ${valueSql(key, value)}`).join(",")}
        WHERE ${whereSql(where)} RETURNING row_to_json("MovieChoiceRoom")`);
      return hydrate(JSON.parse(output));
    },
  };
}

function transactionDelegate(pg: LocalPostgres) {
  return {
    $executeRaw: pg.adapter().$executeRaw,
    movieChoiceRoom: roomDelegate(pg),
  };
}

async function connect() {
  const pg = new LocalPostgres();
  try {
    await pg.query(`SET search_path TO ${identifier(movieChoiceTestSchema)}; SET TIME ZONE 'UTC'`);
    movieChoiceBackendPids.add(Number(await pg.query("SELECT pg_backend_pid()")));
    return pg;
  } catch (error) {
    await pg.close();
    throw error;
  }
}

async function usingConnection<T>(callback: (pg: LocalPostgres) => Promise<T>) {
  const pg = await connect();
  try { return await callback(pg); }
  finally { await pg.close(); }
}

export const movieChoicePostgresAdapter = {
  $transaction: <T>(callback: (tx: ReturnType<typeof transactionDelegate>) => Promise<T>) => usingConnection(async (pg) => {
    await pg.query("BEGIN; SET LOCAL statement_timeout = '5s'; SET LOCAL lock_timeout = '5s'");
    try {
      const result = await callback(transactionDelegate(pg));
      await pg.query("COMMIT");
      return result;
    } catch (error) {
      await pg.query("ROLLBACK").catch(() => {});
      throw error;
    }
  }),
  movieChoiceRoom: {
    create: (args: Parameters<ReturnType<typeof roomDelegate>["create"]>[0]) => usingConnection((pg) => roomDelegate(pg).create(args)),
    findUnique: (args: Parameters<ReturnType<typeof roomDelegate>["findUnique"]>[0]) => usingConnection((pg) => roomDelegate(pg).findUnique(args)),
    findFirst: (args: Parameters<ReturnType<typeof roomDelegate>["findFirst"]>[0]) => usingConnection((pg) => roomDelegate(pg).findFirst(args)),
  },
};
