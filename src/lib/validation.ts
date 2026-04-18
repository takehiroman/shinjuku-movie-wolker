import type {
  ImportPayload,
  ItineraryFilters,
  ScreeningFilters,
  SettingsUpdateInput,
  Theater,
  TravelTime,
} from "../domain/types";
import { MAX_BUFFER_MINUTES, MIN_BUFFER_MINUTES } from "./constants";
import { isValidDateString } from "./date";

export class ValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ValidationError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function asOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new ValidationError("Expected a string value");
  }
  return value.trim();
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ValidationError(`${label} must be a number`);
  }
  return value;
}

function asStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${label} must be an array`);
  }

  return value.map((item, index) => asString(item, `${label}[${index}]`));
}

function parseDelimitedList(value: string | null): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length ? [...new Set(normalized)] : undefined;
}

function assertDate(value: string, label: string): void {
  if (!isValidDateString(value)) {
    throw new ValidationError(`${label} must be YYYY-MM-DD`);
  }
}

export function parseScreeningFilters(searchParams: URLSearchParams): ScreeningFilters {
  const date = searchParams.get("date");
  if (!date) {
    throw new ValidationError("date is required");
  }
  assertDate(date, "date");

  const keyword = asOptionalString(searchParams.get("keyword"));
  const theaterIds = parseDelimitedList(searchParams.get("theaterIds"));
  const tags = parseDelimitedList(searchParams.get("tags"));

  return {
    date,
    keyword,
    theaterIds,
    tags,
  };
}

export function parseItineraryFilters(searchParams: URLSearchParams): ItineraryFilters {
  const base = parseScreeningFilters(searchParams);
  const bufferRaw = searchParams.get("bufferMinutes");
  const startScreeningId = asOptionalString(searchParams.get("startScreeningId"));
  let bufferMinutes: number | undefined;

  if (bufferRaw) {
    bufferMinutes = Number(bufferRaw);
    if (!Number.isInteger(bufferMinutes) || bufferMinutes < MIN_BUFFER_MINUTES || bufferMinutes > MAX_BUFFER_MINUTES) {
      throw new ValidationError(`bufferMinutes must be an integer between ${MIN_BUFFER_MINUTES} and ${MAX_BUFFER_MINUTES}`);
    }
  }

  return {
    ...base,
    bufferMinutes,
    startScreeningId,
  };
}

export function parseSettingsUpdateInput(payload: unknown): SettingsUpdateInput {
  if (!isRecord(payload)) {
    throw new ValidationError("settings payload must be an object");
  }

  const bufferMinutes = asNumber(payload.bufferMinutes, "bufferMinutes");
  if (!Number.isInteger(bufferMinutes) || bufferMinutes < MIN_BUFFER_MINUTES || bufferMinutes > MAX_BUFFER_MINUTES) {
    throw new ValidationError(`bufferMinutes must be an integer between ${MIN_BUFFER_MINUTES} and ${MAX_BUFFER_MINUTES}`);
  }

  const enabledTheaterIds = asStringArray(payload.enabledTheaterIds, "enabledTheaterIds");
  const travelTimes = payload.travelTimes === undefined ? undefined : parseTravelTimes(payload.travelTimes);

  return {
    bufferMinutes,
    enabledTheaterIds,
    travelTimes,
  };
}

function parseTheaters(value: unknown): Theater[] {
  if (!Array.isArray(value)) {
    throw new ValidationError("theaters must be an array");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new ValidationError(`theaters[${index}] must be an object`);
    }

    return {
      id: asString(item.id, `theaters[${index}].id`),
      name: asString(item.name, `theaters[${index}].name`),
      area: asString(item.area, `theaters[${index}].area`),
    };
  });
}

function parseMovies(value: unknown): ImportPayload["movies"] {
  if (!Array.isArray(value)) {
    throw new ValidationError("movies must be an array");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new ValidationError(`movies[${index}] must be an object`);
    }

    return {
      id: asString(item.id, `movies[${index}].id`),
      title: asString(item.title, `movies[${index}].title`),
    };
  });
}

function parseScreenings(value: unknown): ImportPayload["screenings"] {
  if (!Array.isArray(value)) {
    throw new ValidationError("screenings must be an array");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new ValidationError(`screenings[${index}] must be an object`);
    }

    const startAt = asString(item.startAt, `screenings[${index}].startAt`);
    const endAt = asString(item.endAt, `screenings[${index}].endAt`);
    const targetDate = asString(item.targetDate, `screenings[${index}].targetDate`);
    assertDate(targetDate, `screenings[${index}].targetDate`);

    return {
      id: asString(item.id, `screenings[${index}].id`),
      theaterId: asString(item.theaterId, `screenings[${index}].theaterId`),
      movieId: asString(item.movieId, `screenings[${index}].movieId`),
      screenName: item.screenName === undefined || item.screenName === null ? null : asString(item.screenName, `screenings[${index}].screenName`),
      startAt,
      endAt,
      durationMinutes: asNumber(item.durationMinutes, `screenings[${index}].durationMinutes`),
      tags: item.tags === undefined ? [] : asStringArray(item.tags, `screenings[${index}].tags`),
      targetDate,
    };
  });
}

function parseTravelTimes(value: unknown): TravelTime[] {
  if (!Array.isArray(value)) {
    throw new ValidationError("travelTimes must be an array");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new ValidationError(`travelTimes[${index}] must be an object`);
    }

    return {
      fromTheaterId: asString(item.fromTheaterId, `travelTimes[${index}].fromTheaterId`),
      toTheaterId: asString(item.toTheaterId, `travelTimes[${index}].toTheaterId`),
      travelMinutes: asNumber(item.travelMinutes, `travelTimes[${index}].travelMinutes`),
    };
  });
}

export function parseImportPayload(payload: unknown): ImportPayload {
  if (!isRecord(payload)) {
    throw new ValidationError("import payload must be an object");
  }

  return {
    theaters: parseTheaters(payload.theaters),
    movies: parseMovies(payload.movies),
    screenings: parseScreenings(payload.screenings),
    travelTimes: payload.travelTimes === undefined ? [] : parseTravelTimes(payload.travelTimes),
  };
}
