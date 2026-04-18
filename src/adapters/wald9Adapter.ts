import type { AppEnv } from "../db/client";
import type { ImportPayload, ImportedCounts } from "../domain/types";
import { todayDateStringInTimeZone } from "../lib/date";
import { persistAdapterImport } from "../services/importScreenings";
import type { TheaterAdapter } from "./base";
import {
  buildImportPayload,
  extractAllMatches,
  normalizeTags,
  normalizeWhitespace,
  parseTimeRange,
  SHINJUKU_THEATERS,
  splitTitleAndTags,
  stripTags,
} from "./shared";

interface Wald9Raw {
  html: string;
  targetDate: string;
}

export const wald9Adapter: TheaterAdapter<Wald9Raw> = {
  name: "wald9-html",
  async fetchRaw(): Promise<Wald9Raw> {
    const response = await fetch("https://tjoy.jp/shinjuku_wald9", {
      headers: {
        "user-agent": "ShinjukuMovieWolkerBot/0.1 (+https://github.com/takehiroman/shinjuku-movie-wolker)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Wald9 schedule: ${response.status}`);
    }

    const html = await response.text();
    const showDateMatch = html.match(/id="showDate"\s+value="(\d{4}-\d{2}-\d{2})"/);

    return {
      html,
      targetDate: showDateMatch?.[1] ?? todayDateStringInTimeZone("Asia/Tokyo"),
    };
  },
  async normalize(raw: Wald9Raw): Promise<ImportPayload> {
    return normalizeWald9Html(raw.html, raw.targetDate);
  },
  async save(env: AppEnv, payload: ImportPayload): Promise<ImportedCounts> {
    return persistAdapterImport(env, payload, this.name);
  },
};

export function normalizeWald9Html(html: string, targetDate: string): ImportPayload {
  const screenings: Array<{
    movieTitle: string;
    screenName: string | null;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    tags: string[];
    targetDate: string;
  }> = [];
  const filmMatcher =
    /<div class="card-header[\s\S]*?data-target="#film-[^"]+"[\s\S]*?<h5 class="js-title-film[^"]*"[^>]*>([\s\S]*?)<\/h5>[\s\S]*?<div class="panel">[\s\S]*?<ul class="row mb-0 theater align-items-stretch">([\s\S]*?)<\/ul>/g;

  for (const match of html.matchAll(filmMatcher)) {
    const rawTitle = normalizeWhitespace(stripTags(match[1]));
    if (!rawTitle) {
      continue;
    }

    const headerHtml = match[0];
    const sectionHtml = match[2];
    const durationMatch = headerHtml.match(/（本編：\s*(\d+)\s*分）/);
    if (!durationMatch) {
      continue;
    }

    const { title, tags: titleTags } = splitTitleAndTags(rawTitle);
    const badgeTags = extractAllMatches(headerHtml, /class="badge[^"]*"[^>]*>([\s\S]*?)<\/span>/g);
    const listMatcher = /<li class="schedule-box[^"]*"[\s\S]*?<\/li>/g;

    for (const item of sectionHtml.matchAll(listMatcher)) {
      const itemHtml = item[0];
      const screenNameMatch = itemHtml.match(/data-target="#screen\d+"[^>]*>([\s\S]*?)<\/a>/);
      const timeMatch = normalizeWhitespace(stripTags(itemHtml)).match(/(\d{1,2}:\d{2})\s*～\s*(\d{1,2}:\d{2})/);
      if (!screenNameMatch || !timeMatch) {
        continue;
      }

      const scheduleTags = extractAllMatches(itemHtml, /class="theater-btn[^"]*"[^>]*>([\s\S]*?)<\/a>/g);
      const range = parseTimeRange(targetDate, timeMatch[1], timeMatch[2]);

      screenings.push({
        movieTitle: title,
        screenName: normalizeWhitespace(stripTags(screenNameMatch[1])),
        startAt: range.startAt,
        endAt: range.endAt,
        durationMinutes: Number.parseInt(durationMatch[1], 10),
        tags: normalizeTags([...titleTags, ...badgeTags, ...scheduleTags]),
        targetDate,
      });
    }
  }

  if (!screenings.length) {
    throw new Error(`No Wald9 screenings found for ${targetDate}`);
  }

  return buildImportPayload(SHINJUKU_THEATERS.wald9, screenings);
}
