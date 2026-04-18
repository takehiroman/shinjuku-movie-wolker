import type { AppEnv } from "../db/client";
import type { ApiMeta, Itinerary, ItineraryFilters, Screening } from "../domain/types";
import {
  buildItinerary,
  buildTravelTimeMap,
  canChainScreenings,
  compareItineraries,
  getTravelMinutes,
} from "../domain/itinerary";
import { itinerariesCacheKey } from "../cache/keys";
import { getCachedJson, setCachedJson } from "./cache";
import { getScreenings } from "./screenings";
import { getSettings } from "./settings";

export interface ItinerariesResponse {
  itineraries: Itinerary[];
  meta: ApiMeta;
}

export function buildItinerariesFromScreenings(
  screenings: Screening[],
  travelTimes: Map<string, number>,
  bufferMinutes: number,
  startScreeningId?: string,
): Itinerary[] {
  const itineraries: Itinerary[] = [];

  for (let firstIndex = 0; firstIndex < screenings.length; firstIndex += 1) {
    const first = screenings[firstIndex];
    if (startScreeningId && first.id !== startScreeningId) {
      continue;
    }

    for (let secondIndex = firstIndex + 1; secondIndex < screenings.length; secondIndex += 1) {
      const second = screenings[secondIndex];
      const travelMinutes = getTravelMinutes(first, second, travelTimes);

      if (!canChainScreenings(first, second, travelMinutes, bufferMinutes)) {
        continue;
      }

      itineraries.push(buildItinerary(first, second, travelMinutes, bufferMinutes));
    }
  }

  return itineraries.sort(compareItineraries);
}

export async function getItineraries(env: AppEnv, filters: ItineraryFilters): Promise<ItinerariesResponse> {
  const settings = await getSettings(env);
  const bufferMinutes = filters.bufferMinutes ?? settings.bufferMinutes;
  const cacheKey = itinerariesCacheKey(filters, bufferMinutes);
  const cached = await getCachedJson<ItinerariesResponse>(env.CACHE, cacheKey);
  if (cached) {
    return cached;
  }

  const screeningsResponse = await getScreenings(env, filters);
  const travelTimes = buildTravelTimeMap(settings.travelTimes);
  const itineraries = buildItinerariesFromScreenings(
    screeningsResponse.screenings,
    travelTimes,
    bufferMinutes,
    filters.startScreeningId,
  );

  const response: ItinerariesResponse = {
    itineraries,
    meta: {
      ...screeningsResponse.meta,
      count: itineraries.length,
      bufferMinutes,
      startScreeningId: filters.startScreeningId,
    },
  };

  await setCachedJson(env.CACHE, cacheKey, response);
  return response;
}
