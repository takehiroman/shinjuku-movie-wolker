import type { AppEnv } from "../db/client";
import type { ImportPayload, ImportedCounts } from "../domain/types";
import { tomorrowDateStringInTimeZone } from "../lib/date";
import { persistAdapterImport } from "../services/importScreenings";
import type { TheaterAdapter } from "./base";
import {
  buildImportPayload,
  normalizeTags,
  normalizeWhitespace,
  parseTimeRange,
  SHINJUKU_THEATERS,
} from "./shared";

interface TohoScheduleItem {
  code: number;
  showingStart: string;
  showingEnd: string;
  eventIcon: string;
}

interface TohoScreen {
  ename: string;
  name: string;
  iconNm1: string;
  iconNm2: string;
  iconNm3: string;
  facilities: Array<{ name: string }>;
  list: TohoScheduleItem[];
}

interface TohoMovie {
  hours: number;
  name: string;
  ratingCd: string;
  list: TohoScreen[];
}

interface TohoTheater {
  name: string;
  list: TohoMovie[];
}

interface TohoScheduleResponse {
  status: string;
  data: Array<{
    list: TohoTheater[];
  }>;
}

interface TohoRaw {
  payload: TohoScheduleResponse;
  targetDate: string;
}

const TOHO_SCHEDULE_URL =
  "https://api2.tohotheater.jp/api/schedule/v1/schedule/076/TNPI3050J02?__type__=html&__useResultInfo__=no&vg_cd=076&show_day=%DATE%&term=99&isMember=&enter_kbn=&_dc=%TIMESTAMP%";

const TOHO_RATING_TAGS: Record<string, string | undefined> = {
  "01": "pg12",
  "02": "r15+",
  "03": "r18+",
};

const TOHO_EVENT_ICON_TAGS: Record<string, string | undefined> = {
  "schedule_ico02-3.gif": "late",
  "schedule_ico02-4.gif": "midnight",
  "schedule_ico02-8.gif": "special",
  "schedule_ico02-11.gif": "matinee",
  "schedule_ico02-12.gif": "preview",
};

export const tohoShinjukuAdapter: TheaterAdapter<TohoRaw> = {
  name: "toho-shinjuku-api",
  async fetchRaw(): Promise<TohoRaw> {
    const targetDate = tomorrowDateStringInTimeZone("Asia/Tokyo");
    const response = await fetch(
      TOHO_SCHEDULE_URL.replace("%DATE%", targetDate.replaceAll("-", "")).replace("%TIMESTAMP%", `${Date.now()}`),
      {
        headers: {
          accept: "application/json",
          referer: "https://hlo.tohotheater.jp/net/schedule/076/TNPI2000J01.do",
          "user-agent": "ShinjukuMovieWolkerBot/0.1 (+https://github.com/takehiroman/shinjuku-movie-wolker)",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch TOHO Shinjuku schedule: ${response.status}`);
    }

    const payload = (await response.json()) as TohoScheduleResponse;
    return { payload, targetDate };
  },
  async normalize(raw: TohoRaw): Promise<ImportPayload> {
    return normalizeTohoSchedule(raw.payload, raw.targetDate);
  },
  async save(env: AppEnv, payload: ImportPayload): Promise<ImportedCounts> {
    return persistAdapterImport(env, payload, this.name);
  },
};

export function normalizeTohoSchedule(payload: TohoScheduleResponse, targetDate: string): ImportPayload {
  const theater = payload.data?.[0]?.list?.[0];
  if (!theater?.list?.length) {
    throw new Error(`No TOHO Shinjuku screenings found for ${targetDate}`);
  }

  const screenings: Array<{
    movieTitle: string;
    screenName: string | null;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    tags: string[];
    targetDate: string;
  }> = [];

  for (const movie of theater.list) {
    const parsedMovie = parseTohoMovieName(movie.name);
    const ratingTag = TOHO_RATING_TAGS[movie.ratingCd];

    for (const screen of movie.list) {
      const facilityTags = [screen.iconNm1, screen.iconNm2, screen.iconNm3, ...screen.facilities.map((item) => item.name)];

      for (const item of screen.list) {
        if (!item.code || !item.showingStart || !item.showingEnd) {
          continue;
        }

        const range = parseTimeRange(targetDate, item.showingStart, item.showingEnd);
        const eventTag = item.eventIcon ? TOHO_EVENT_ICON_TAGS[item.eventIcon.split("/").pop() ?? ""] : undefined;

        screenings.push({
          movieTitle: parsedMovie.title,
          screenName: normalizeWhitespace(screen.name || screen.ename || ""),
          startAt: range.startAt,
          endAt: range.endAt,
          durationMinutes: movie.hours,
          tags: normalizeTags([
            ...parsedMovie.tags,
            ...(ratingTag ? [ratingTag] : []),
            ...facilityTags,
            ...(eventTag ? [eventTag] : []),
          ]),
          targetDate,
        });
      }
    }
  }

  if (!screenings.length) {
    throw new Error(`No TOHO Shinjuku screenings normalized for ${targetDate}`);
  }

  return buildImportPayload(SHINJUKU_THEATERS.tohoShinjuku, screenings);
}

function parseTohoMovieName(rawName: string): { title: string; tags: string[] } {
  let title = normalizeWhitespace(rawName);
  const tags: string[] = [];

  const suffixes: Array<[RegExp, string]> = [
    [/\s*（字幕版）$/u, "subtitle"],
    [/\s*（吹替版）$/u, "dub"],
    [/\s*（ＩＭＡＸレーザー）$/u, "imax-laser"],
    [/\s*（ＩＭＡＸ）$/u, "imax"],
    [/\s*（ＭＸ４Ｄ）$/u, "mx4d"],
    [/\s*（Ｄｏｌｂｙ　Ａｔｍｏｓ）$/u, "dolby-atmos"],
    [/\s*（Ｄｏｌｂｙ　Ｃｉｎｅｍａ）$/u, "dolby-cinema"],
    [/\s*（ＴＣＸ）$/u, "tcx"],
  ];

  for (const [pattern, tag] of suffixes) {
    if (pattern.test(title)) {
      title = title.replace(pattern, "").trim();
      tags.push(tag);
    }
  }

  return {
    title,
    tags,
  };
}
