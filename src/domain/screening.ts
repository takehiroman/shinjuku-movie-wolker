import type { Screening, ScreeningFilters } from "./types";
import { extractTimeString, toTimestamp } from "../lib/date";

function extractDateString(value: string): string {
  return value.slice(0, 10);
}

export function normalizeTags(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
}

export function serializeTags(tags: string[] | undefined): string {
  return JSON.stringify(normalizeTags(tags));
}

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeTags(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return [];
  }
}

export function sortScreeningsByStartAt(screenings: Screening[]): Screening[] {
  return [...screenings].sort((left, right) => {
    const startDiff = toTimestamp(left.startAt) - toTimestamp(right.startAt);
    if (startDiff !== 0) {
      return startDiff;
    }
    return left.id.localeCompare(right.id);
  });
}

export function screeningMatchesFilters(screening: Screening, filters: ScreeningFilters): boolean {
  if (screening.targetDate !== filters.date) {
    return false;
  }

  if (filters.theaterIds?.length && !filters.theaterIds.includes(screening.theaterId)) {
    return false;
  }

  if (filters.keyword) {
    const keyword = filters.keyword.trim().toLocaleLowerCase();
    const haystack = `${screening.movieTitle} ${screening.theaterName}`.toLocaleLowerCase();
    if (!haystack.includes(keyword)) {
      return false;
    }
  }

  if (filters.tags?.length) {
    const screeningTags = new Set(normalizeTags(screening.tags));
    for (const tag of filters.tags) {
      if (!screeningTags.has(tag)) {
        return false;
      }
    }
  }

  if (filters.startTime && extractTimeString(screening.startAt) < filters.startTime) {
    return false;
  }

  if (filters.startTime && extractDateString(screening.startAt) !== filters.date) {
    return false;
  }

  if (filters.endTime) {
    if (extractDateString(screening.endAt) !== filters.date) {
      return false;
    }

    if (extractTimeString(screening.endAt) > filters.endTime) {
      return false;
    }
  }

  return true;
}

export function collectAvailableTags(screenings: Screening[]): string[] {
  return [...new Set(screenings.flatMap((screening) => screening.tags))].sort((left, right) =>
    left.localeCompare(right),
  );
}
