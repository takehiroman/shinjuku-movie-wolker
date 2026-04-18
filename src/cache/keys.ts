import type { ItineraryFilters, ScreeningFilters } from "../domain/types";
import { stableHash } from "../lib/hash";
import { DEFAULT_SETTINGS_ID } from "../lib/constants";

export function screeningsCacheKey(filters: ScreeningFilters): string {
  return `screenings:${filters.date}:${stableHash(filters)}`;
}

export function itinerariesCacheKey(filters: ItineraryFilters, bufferMinutes: number): string {
  return `itineraries:${filters.date}:${bufferMinutes}:${stableHash(filters)}`;
}

export function settingsCacheKey(): string {
  return `settings:${DEFAULT_SETTINGS_ID}`;
}
