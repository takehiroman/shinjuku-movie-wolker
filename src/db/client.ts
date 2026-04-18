export interface AppEnv {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS?: Fetcher;
  APP_ENV?: string;
  DEFAULT_BUFFER_MINUTES?: string;
}

export async function all<T>(db: D1Database, sql: string, bindings: unknown[] = []): Promise<T[]> {
  const statement = db.prepare(sql).bind(...bindings);
  const result = await statement.all<T>();
  return result.results ?? [];
}

export async function first<T>(db: D1Database, sql: string, bindings: unknown[] = []): Promise<T | null> {
  const statement = db.prepare(sql).bind(...bindings);
  return statement.first<T>();
}

export async function run(db: D1Database, sql: string, bindings: unknown[] = []): Promise<D1Result> {
  return db.prepare(sql).bind(...bindings).run();
}
