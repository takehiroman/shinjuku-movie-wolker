import type { AppEnv } from "../db/client";
import { piccadillyAdapter } from "../adapters/piccadillyAdapter";
import { tohoShinjukuAdapter } from "../adapters/tohoShinjukuAdapter";
import { wald9Adapter } from "../adapters/wald9Adapter";
import type { TheaterAdapter } from "../adapters/base";

const adapters: TheaterAdapter[] = [wald9Adapter, piccadillyAdapter, tohoShinjukuAdapter];

export async function updateScreeningsJob(env: AppEnv): Promise<void> {
  for (const adapter of adapters) {
    try {
      const raw = await adapter.fetchRaw(env);
      const normalized = await adapter.normalize(raw);
      const result = await adapter.save(env, normalized);
      console.log(`[updateScreeningsJob] ${adapter.name} imported`, result);
    } catch (error) {
      console.error(`[updateScreeningsJob] ${adapter.name} failed`, error);
    }
  }
}
