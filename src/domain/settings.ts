import type { Settings, SettingsUpdateInput, Theater } from "./types";
import {
  DEFAULT_BUFFER_MINUTES,
  MAX_BUFFER_MINUTES,
  MIN_BUFFER_MINUTES,
} from "../lib/constants";

export function normalizeBufferMinutes(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_BUFFER_MINUTES;
  }

  return Math.min(MAX_BUFFER_MINUTES, Math.max(MIN_BUFFER_MINUTES, Math.round(value)));
}

export function resolveEnabledTheaterIds(
  requestedTheaterIds: string[] | undefined,
  theaters: Theater[],
): string[] {
  const activeTheaterIds = theaters
    .filter((theater) => theater.isActive !== false)
    .map((theater) => theater.id);

  if (!requestedTheaterIds?.length) {
    return activeTheaterIds;
  }

  const activeSet = new Set(activeTheaterIds);
  return [...new Set(requestedTheaterIds)].filter((theaterId) => activeSet.has(theaterId));
}

export function buildUpdatedSettings(
  current: Settings,
  input: SettingsUpdateInput,
  theaters: Theater[],
): Settings {
  return {
    bufferMinutes: normalizeBufferMinutes(input.bufferMinutes),
    enabledTheaterIds: resolveEnabledTheaterIds(input.enabledTheaterIds, theaters),
  };
}
