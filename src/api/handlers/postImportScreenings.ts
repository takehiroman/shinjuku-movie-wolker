import type { AppEnv } from "../../db/client";
import { parseImportPayload } from "../../lib/validation";
import { deleteByPrefix } from "../../services/cache";
import { deactivateMissingTheaters, upsertTheaters } from "../../db/repositories/theatersRepo";
import { upsertMovies } from "../../db/repositories/moviesRepo";
import { deleteScreeningsByDates, upsertScreenings } from "../../db/repositories/screeningsRepo";
import { upsertTravelTimes } from "../../db/repositories/travelTimesRepo";
import { jsonResponse } from "../router";

export async function postImportScreeningsHandler(request: Request, env: AppEnv): Promise<Response> {
  const rawPayload = await request.json<unknown>();
  const payload = parseImportPayload(rawPayload);
  const now = new Date().toISOString();
  const targetDates = [...new Set(payload.screenings.map((screening) => screening.targetDate))];

  await upsertTheaters(env.DB, payload.theaters, now);
  await deactivateMissingTheaters(
    env.DB,
    payload.theaters.map((theater) => theater.id),
    now,
  );
  await upsertMovies(env.DB, payload.movies, now);
  await deleteScreeningsByDates(env.DB, targetDates);
  await upsertScreenings(env.DB, payload.screenings, now);
  if (payload.travelTimes?.length) {
    await upsertTravelTimes(env.DB, payload.travelTimes, now);
  }

  await Promise.all([
    deleteByPrefix(env.CACHE, "settings:"),
    ...targetDates.map((targetDate) => deleteByPrefix(env.CACHE, `screenings:${targetDate}:`)),
    ...targetDates.map((targetDate) => deleteByPrefix(env.CACHE, `itineraries:${targetDate}:`)),
  ]);

  return jsonResponse({
    imported: {
      theaters: payload.theaters.length,
      movies: payload.movies.length,
      screenings: payload.screenings.length,
      travelTimes: payload.travelTimes?.length ?? 0,
    },
  });
}
