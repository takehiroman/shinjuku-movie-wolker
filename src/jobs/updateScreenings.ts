import type { AppEnv } from "../db/client";
import { dummyTheaterAdapter } from "../adapters/dummyTheaterAdapter";
import type { TheaterAdapter } from "../adapters/base";

const adapters: TheaterAdapter[] = [dummyTheaterAdapter];

export async function updateScreeningsJob(env: AppEnv): Promise<void> {
  for (const adapter of adapters) {
    const raw = await adapter.fetchRaw(env);
    const normalized = await adapter.normalize(raw);
    await adapter.save(env, normalized);
  }
}
