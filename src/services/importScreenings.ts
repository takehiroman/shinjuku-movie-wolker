import { upsertMovies } from "../db/repositories/moviesRepo";
import {
  deleteScreeningsByDates,
  deleteScreeningsByTheatersAndDates,
  upsertScreenings,
} from "../db/repositories/screeningsRepo";
import { deactivateMissingTheaters, upsertTheaters } from "../db/repositories/theatersRepo";
import { upsertTravelTimes } from "../db/repositories/travelTimesRepo";
import type { AppEnv } from "../db/client";
import type { ImportPayload, ImportedCounts } from "../domain/types";
import { deleteByPrefix } from "./cache";

interface PersistImportOptions {
  mode: "full-replace" | "theater-replace";
  sourceType: string;
}

export async function persistImportPayload(
  env: AppEnv,
  payload: ImportPayload,
  options: PersistImportOptions,
): Promise<ImportedCounts> {
  const now = new Date().toISOString();
  const targetDates = [...new Set(payload.screenings.map((screening) => screening.targetDate))];
  const theaterIds = [...new Set(payload.theaters.map((theater) => theater.id))];

  await upsertTheaters(env.DB, payload.theaters, now);

  if (options.mode === "full-replace") {
    await deactivateMissingTheaters(env.DB, theaterIds, now);
    await deleteScreeningsByDates(env.DB, targetDates);
  } else {
    await deleteScreeningsByTheatersAndDates(env.DB, theaterIds, targetDates);
  }

  await upsertMovies(env.DB, payload.movies, now);
  await upsertScreenings(env.DB, payload.screenings, now, options.sourceType);

  if (payload.travelTimes?.length) {
    await upsertTravelTimes(env.DB, payload.travelTimes, now);
  }

  await Promise.all([
    deleteByPrefix(env.CACHE, "settings:"),
    ...targetDates.map((targetDate) => deleteByPrefix(env.CACHE, `screenings:${targetDate}:`)),
    ...targetDates.map((targetDate) => deleteByPrefix(env.CACHE, `itineraries:${targetDate}:`)),
  ]);

  return {
    theaters: payload.theaters.length,
    movies: payload.movies.length,
    screenings: payload.screenings.length,
    travelTimes: payload.travelTimes?.length ?? 0,
  };
}

export async function persistManualImport(env: AppEnv, payload: ImportPayload): Promise<ImportedCounts> {
  return persistImportPayload(env, payload, {
    mode: "full-replace",
    sourceType: "json-import",
  });
}

export async function persistAdapterImport(
  env: AppEnv,
  payload: ImportPayload,
  sourceType: string,
): Promise<ImportedCounts> {
  return persistImportPayload(env, payload, {
    mode: "theater-replace",
    sourceType,
  });
}
