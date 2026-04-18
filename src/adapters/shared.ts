import type { ImportPayload, Theater, TravelTime } from "../domain/types";
import { DEFAULT_AREA } from "../lib/constants";
import { stableHash } from "../lib/hash";

export const SHINJUKU_THEATERS = {
  wald9: {
    id: "wald9",
    name: "新宿バルト9",
    area: DEFAULT_AREA,
  } satisfies Theater,
  piccadilly: {
    id: "piccadilly",
    name: "新宿ピカデリー",
    area: DEFAULT_AREA,
  } satisfies Theater,
  tohoShinjuku: {
    id: "toho-shinjuku",
    name: "TOHOシネマズ新宿",
    area: DEFAULT_AREA,
  } satisfies Theater,
} as const;

export const DEFAULT_TRAVEL_TIMES: TravelTime[] = [
  { fromTheaterId: "wald9", toTheaterId: "piccadilly", travelMinutes: 8 },
  { fromTheaterId: "piccadilly", toTheaterId: "wald9", travelMinutes: 8 },
  { fromTheaterId: "wald9", toTheaterId: "toho-shinjuku", travelMinutes: 14 },
  { fromTheaterId: "toho-shinjuku", toTheaterId: "wald9", travelMinutes: 14 },
  { fromTheaterId: "piccadilly", toTheaterId: "toho-shinjuku", travelMinutes: 11 },
  { fromTheaterId: "toho-shinjuku", toTheaterId: "piccadilly", travelMinutes: 11 },
];

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

const TAG_ALIASES: Record<string, string | null> = {
  "3d": "3d",
  "4dx": "4dx",
  dolby: "dolby",
  "dolby atmos": "dolby-atmos",
  dolbyatmos: "dolby-atmos",
  "dolby cinema": "dolby-cinema",
  dolbycinema: "dolby-cinema",
  imax: "imax",
  last: null,
  new: null,
  "pg12": "pg12",
  "r15+": "r15+",
  "r18+": "r18+",
  special: "special",
  subtitle: "subtitle",
  dub: "dub",
  "バリアフリー": "accessible",
  "ミッドナイト": "midnight",
  "レイトショー": "late",
  "吹替": "dub",
  "字幕": "subtitle",
  "特別興行": "special",
};

export function decodeHtml(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return HTML_ENTITY_MAP[entity] ?? `&${entity};`;
  });
}

export function stripTags(value: string): string {
  return decodeHtml(value).replace(/<[^>]+>/g, " ");
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function extractAllMatches(source: string, expression: RegExp): string[] {
  const flags = expression.flags.includes("g") ? expression.flags : `${expression.flags}g`;
  const matcher = new RegExp(expression.source, flags);
  const values: string[] = [];

  for (const match of source.matchAll(matcher)) {
    if (match[1]) {
      values.push(normalizeWhitespace(stripTags(match[1])));
    }
  }

  return values;
}

export function slugifyTag(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9+\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function normalizeTag(value: string): string | null {
  const normalized = normalizeWhitespace(stripTags(value));
  if (!normalized) {
    return null;
  }

  const exact = TAG_ALIASES[normalized];
  if (exact !== undefined) {
    return exact;
  }

  const compact = normalized.toLocaleLowerCase().replace(/\s+/g, "");
  const compactAlias = TAG_ALIASES[compact];
  if (compactAlias !== undefined) {
    return compactAlias;
  }

  const lowered = normalized.toLocaleLowerCase();
  const loweredAlias = TAG_ALIASES[lowered];
  if (loweredAlias !== undefined) {
    return loweredAlias;
  }

  return slugifyTag(normalized) || normalized;
}

export function normalizeTags(values: string[]): string[] {
  return [...new Set(values.map(normalizeTag).filter((value): value is string => Boolean(value)))];
}

export function splitTitleAndTags(rawTitle: string): { title: string; tags: string[] } {
  let title = normalizeWhitespace(stripTags(rawTitle));
  const tags: string[] = [];

  title = title.replace(/^((?:【[^】]+】\s*)+)/u, (labelGroup) => {
    for (const label of labelGroup.matchAll(/【([^】]+)】/gu)) {
      tags.push(label[1]);
    }
    return "";
  });

  const ratingMatch = title.match(/\((PG12|R15\+|R18\+)\)$/i);
  if (ratingMatch) {
    tags.push(ratingMatch[1]);
    title = title.slice(0, -ratingMatch[0].length).trim();
  }

  return {
    title,
    tags: normalizeTags(tags),
  };
}

export function createMovieId(title: string): string {
  return `movie-${stableHash(title.toLocaleLowerCase())}`;
}

export function createScreeningId(input: {
  theaterId: string;
  movieId: string;
  screenName: string | null;
  startAt: string;
}): string {
  return `scr-${stableHash(input)}`;
}

export function isoFromTotalMinutes(targetDate: string, totalMinutes: number): string {
  const [year, month, day] = targetDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const minuteOfDay = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;

  date.setUTCDate(date.getUTCDate() + dayOffset);

  const isoDate = [
    `${date.getUTCFullYear()}`,
    `${date.getUTCMonth() + 1}`.padStart(2, "0"),
    `${date.getUTCDate()}`.padStart(2, "0"),
  ].join("-");

  return `${isoDate}T${`${hours}`.padStart(2, "0")}:${`${minutes}`.padStart(2, "0")}:00+09:00`;
}

export function parseTimeRange(targetDate: string, startLabel: string, endLabel: string): {
  startAt: string;
  endAt: string;
} {
  const startMinutes = toTotalMinutes(startLabel);
  let endMinutes = toTotalMinutes(endLabel);
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return {
    startAt: isoFromTotalMinutes(targetDate, startMinutes),
    endAt: isoFromTotalMinutes(targetDate, endMinutes),
  };
}

export function buildImportPayload(
  theater: Theater,
  screenings: Array<{
    movieTitle: string;
    screenName: string | null;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    tags: string[];
    targetDate: string;
  }>,
  travelTimes: TravelTime[] = DEFAULT_TRAVEL_TIMES,
): ImportPayload {
  const movies = new Map<string, { id: string; title: string }>();

  const normalizedScreenings = screenings.map((screening) => {
    const movieId = createMovieId(screening.movieTitle);
    movies.set(movieId, { id: movieId, title: screening.movieTitle });

    return {
      id: createScreeningId({
        theaterId: theater.id,
        movieId,
        screenName: screening.screenName,
        startAt: screening.startAt,
      }),
      theaterId: theater.id,
      movieId,
      screenName: screening.screenName,
      startAt: screening.startAt,
      endAt: screening.endAt,
      durationMinutes: screening.durationMinutes,
      tags: normalizeTags(screening.tags),
      targetDate: screening.targetDate,
    };
  });

  return {
    theaters: [theater],
    movies: [...movies.values()],
    screenings: normalizedScreenings,
    travelTimes,
  };
}

function toTotalMinutes(value: string): number {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    throw new Error(`Invalid time label: ${value}`);
  }

  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}
