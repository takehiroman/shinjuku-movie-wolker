import type { AppEnv } from "../db/client";
import type { Settings, SettingsUpdateInput, SettingsView } from "../domain/types";
import { buildUpdatedSettings, resolveEnabledTheaterIds } from "../domain/settings";
import { DEFAULT_BUFFER_MINUTES } from "../lib/constants";
import { settingsCacheKey } from "../cache/keys";
import { deleteByPrefix, getCachedJson, setSettingsCache } from "./cache";
import { listActiveTheaters } from "../db/repositories/theatersRepo";
import { getSettingsRow, upsertSettings } from "../db/repositories/settingsRepo";
import { listTravelTimes, upsertTravelTimes } from "../db/repositories/travelTimesRepo";

export async function getSettings(env: AppEnv): Promise<SettingsView> {
  const cacheKey = settingsCacheKey();
  const cached = await getCachedJson<SettingsView>(env.CACHE, cacheKey);
  if (cached) {
    return cached;
  }

  const theaters = await listActiveTheaters(env.DB);
  const stored = await getSettingsRow(env.DB);
  const activeTheaterIds = new Set(theaters.map((theater) => theater.id));
  const travelTimes = (await listTravelTimes(env.DB)).filter(
    (travelTime) =>
      activeTheaterIds.has(travelTime.fromTheaterId) &&
      activeTheaterIds.has(travelTime.toTheaterId),
  );

  const settings: Settings =
    stored
      ? {
          bufferMinutes: stored.bufferMinutes,
          enabledTheaterIds: resolveEnabledTheaterIds(stored.enabledTheaterIds, theaters),
        }
      : {
          bufferMinutes: Number(env.DEFAULT_BUFFER_MINUTES ?? DEFAULT_BUFFER_MINUTES),
          enabledTheaterIds: theaters.filter((theater) => theater.isActive !== false).map((theater) => theater.id),
        };

  const view: SettingsView = {
    ...settings,
    theaters,
    travelTimes,
  };

  await setSettingsCache(env.CACHE, cacheKey, view);
  return view;
}

export async function updateSettings(env: AppEnv, input: SettingsUpdateInput): Promise<SettingsView> {
  const now = new Date().toISOString();
  const theaters = await listActiveTheaters(env.DB);
  const current = await getSettings(env);
  const nextSettings = buildUpdatedSettings(current, input, theaters);

  await upsertSettings(env.DB, nextSettings, now);
  if (input.travelTimes) {
    await upsertTravelTimes(env.DB, input.travelTimes, now);
  }

  await invalidateSettingsRelatedCaches(env);
  return getSettings(env);
}

export function resolveEffectiveTheaterIds(
  requestedTheaterIds: string[] | undefined,
  settings: SettingsView,
): string[] {
  return resolveEnabledTheaterIds(
    requestedTheaterIds?.length ? requestedTheaterIds : settings.enabledTheaterIds,
    settings.theaters,
  );
}

export async function invalidateSettingsRelatedCaches(env: AppEnv): Promise<void> {
  await Promise.all([
    deleteByPrefix(env.CACHE, "settings:"),
    deleteByPrefix(env.CACHE, "screenings:"),
    deleteByPrefix(env.CACHE, "itineraries:"),
  ]);
}
