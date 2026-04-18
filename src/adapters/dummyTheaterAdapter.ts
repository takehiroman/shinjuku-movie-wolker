import type { AppEnv } from "../db/client";
import type { ImportPayload, ImportedCounts } from "../domain/types";
import type { TheaterAdapter } from "./base";

export const dummyTheaterAdapter: TheaterAdapter<ImportPayload> = {
  name: "dummy-theater-adapter",
  async fetchRaw(): Promise<ImportPayload> {
    return {
      theaters: [],
      movies: [],
      screenings: [],
      travelTimes: [],
    };
  },
  async normalize(raw: ImportPayload): Promise<ImportPayload> {
    return raw;
  },
  async save(_env: AppEnv, payload: ImportPayload): Promise<ImportedCounts> {
    return {
      theaters: payload.theaters.length,
      movies: payload.movies.length,
      screenings: payload.screenings.length,
      travelTimes: payload.travelTimes?.length ?? 0,
    };
  },
};
