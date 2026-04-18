import type { AppEnv } from "../db/client";
import type { ApiMeta, Screening, ScreeningFilters, Theater } from "../domain/types";
import { collectAvailableTags, screeningMatchesFilters, sortScreeningsByStartAt } from "../domain/screening";
import { screeningsCacheKey } from "../cache/keys";
import { getCachedJson, setCachedJson } from "./cache";
import { listScreeningsByDate } from "../db/repositories/screeningsRepo";
import { getSettings, resolveEffectiveTheaterIds } from "./settings";

export interface ScreeningsResponse {
  screenings: Screening[];
  meta: ApiMeta;
}

export function applyScreeningFilters(screenings: Screening[], filters: ScreeningFilters): Screening[] {
  return sortScreeningsByStartAt(screenings.filter((screening) => screeningMatchesFilters(screening, filters)));
}

function collectAvailableTheaters(screenings: Screening[], theaters: Theater[]): Theater[] {
  const theaterIds = new Set(screenings.map((screening) => screening.theaterId));
  return theaters.filter((theater) => theaterIds.has(theater.id));
}

export async function getScreenings(env: AppEnv, filters: ScreeningFilters): Promise<ScreeningsResponse> {
  const settings = await getSettings(env);
  const effectiveFilters: ScreeningFilters = {
    ...filters,
    theaterIds: resolveEffectiveTheaterIds(filters.theaterIds, settings),
  };
  const cacheKey = screeningsCacheKey(effectiveFilters);
  const cached = await getCachedJson<ScreeningsResponse>(env.CACHE, cacheKey);
  if (cached) {
    return cached;
  }

  const allForDate = await listScreeningsByDate(env.DB, effectiveFilters.date);
  const screenings = applyScreeningFilters(allForDate, effectiveFilters);

  const response: ScreeningsResponse = {
    screenings,
    meta: {
      count: screenings.length,
      date: effectiveFilters.date,
      theaterIds: effectiveFilters.theaterIds,
      keyword: effectiveFilters.keyword,
      tags: effectiveFilters.tags,
      startTime: effectiveFilters.startTime,
      endTime: effectiveFilters.endTime,
      availableTheaters: collectAvailableTheaters(allForDate, settings.theaters),
      availableTags: collectAvailableTags(allForDate),
    },
  };

  await setCachedJson(env.CACHE, cacheKey, response);
  return response;
}
