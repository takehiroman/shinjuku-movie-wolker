import type { AppEnv } from "../db/client";
import type { ImportPayload, ImportedCounts } from "../domain/types";

export interface TheaterAdapter<TRaw = unknown> {
  name: string;
  fetchRaw(env: AppEnv): Promise<TRaw>;
  normalize(raw: TRaw): Promise<ImportPayload>;
  save(env: AppEnv, payload: ImportPayload): Promise<ImportedCounts>;
}
