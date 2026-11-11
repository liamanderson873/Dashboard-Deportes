import postgres, { type Sql } from "postgres";
import { es } from "@/lib/es";

/** Thrown when the database connection is not configured. */
export class DatabaseConfigError extends Error {
  constructor(message: string = es.error.missingDatabaseUrl) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

/**
 * Removes a "+driver" suffix from the URL scheme only
 * ("postgresql+psycopg://" -> "postgresql://"). The rest of the URL
 * (user, password, host, path) is left untouched.
 */
export function normalizeDatabaseUrl(url: string): string {
  const schemeEnd = url.indexOf("://");
  if (schemeEnd === -1) return url;
  const scheme = url.slice(0, schemeEnd);
  const plus = scheme.indexOf("+");
  if (plus === -1) return url;
  return scheme.slice(0, plus) + url.slice(schemeEnd);
}

const POOL_KEY = Symbol.for("sports-dashboard.web.sql-pool");
type PoolHolder = { [POOL_KEY]?: Sql };

/** One connection pool per process; survives hot reloads in development. */
export function getSql(): Sql {
  const holder = globalThis as unknown as PoolHolder;
  const existing = holder[POOL_KEY];
  if (existing) return existing;

  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseConfigError();

  const sql = postgres(normalizeDatabaseUrl(url), { max: 5, connect_timeout: 5 });
  holder[POOL_KEY] = sql;
  return sql;
}
