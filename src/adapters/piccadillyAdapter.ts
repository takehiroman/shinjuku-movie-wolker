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

interface PiccadillyRaw {
  html: string;
  targetDate: string;
}

const PICCADILLY_SCHEDULE_URL = "https://www.smt-cinema.com/html/site/pc/schedule/s0100_1051_%DATE%_schedule_daily_movie_area.html";

export const piccadillyAdapter: TheaterAdapter<PiccadillyRaw> = {
  name: "piccadilly-html",
  async fetchRaw(): Promise<PiccadillyRaw> {
    const targetDate = todayDateStringInTimeZone("Asia/Tokyo");
    const response = await fetch(PICCADILLY_SCHEDULE_URL.replace("%DATE%", targetDate.replaceAll("-", "")), {
      headers: {
        "user-agent": "ShinjukuMovieWolkerBot/0.1 (+https://github.com/takehiroman/shinjuku-movie-wolker)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Piccadilly schedule: ${response.status}`);
    }

    return {
      html: await response.text(),
      targetDate,
    };
  },
  async normalize(raw: PiccadillyRaw): Promise<ImportPayload> {
    return normalizePiccadillyHtml(raw.html, raw.targetDate);
  },
  async save(env: AppEnv, payload: ImportPayload): Promise<ImportedCounts> {
    return persistAdapterImport(env, payload, this.name);
  },
};

export function normalizePiccadillyHtml(html: string, targetDate: string): ImportPayload {
  const screenings: Array<{
    movieTitle: string;
    screenName: string | null;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    tags: string[];
    targetDate: string;
  }> = [];
  const sectionMatcher = /<section class="[^"]+">[\s\S]*?<div class="movieTitle">[\s\S]*?<\/section>/g;

  for (const match of html.matchAll(sectionMatcher)) {
    const sectionHtml = match[0];
    const titleBlock = sectionHtml.match(/<h2>([\s\S]*?)<\/h2>/)?.[1];
    const tagBlock = sectionHtml.match(/<p class="tag">([\s\S]*?)<\/p>/)?.[1] ?? "";
    const selectionHtml = sectionHtml.match(/<div class="select matchHeight clearfix">([\s\S]*?)<\/div>\s*<span class="next/s)?.[1] ?? "";
    if (!titleBlock || !selectionHtml) {
      continue;
    }

    const rawTitle = normalizeWhitespace(stripTags(titleBlock).replace(/（本編：\s*\d+\s*分）/, ""));
    if (!rawTitle) {
      continue;
    }

    const durationMatch = stripTags(titleBlock).match(/本編：\s*(\d+)\s*分/);
    if (!durationMatch) {
      continue;
    }

    const sectionTags = extractAllMatches(tagBlock, /<span[^>]*>([\s\S]*?)<\/span>/g);
    const { title, tags: titleTags } = splitTitleAndTags(rawTitle);
    const blockMatcher = /<div class="block [^"]+">[\s\S]*?<\/div>\s*<\/div>/g;

    for (const block of selectionHtml.matchAll(blockMatcher)) {
      const blockHtml = block[0];
      const screenNameMatch = blockHtml.match(/<h3>[\s\S]*?>([\s\S]*?)<\/a><\/h3>/);
      const timeLabel = normalizeWhitespace(stripTags(blockHtml.match(/<p class="time">([\s\S]*?)<\/p>/)?.[1] ?? ""));
      const timeMatch = timeLabel.match(/(\d{1,2}:\d{2})\s*～\s*(\d{1,2}:\d{2})/);
      if (!screenNameMatch || !timeMatch) {
        continue;
      }

      const range = parseTimeRange(targetDate, timeMatch[1], timeMatch[2]);
      screenings.push({
        movieTitle: title,
        screenName: normalizeWhitespace(stripTags(screenNameMatch[1])),
        startAt: range.startAt,
        endAt: range.endAt,
        durationMinutes: Number.parseInt(durationMatch[1], 10),
        tags: normalizeTags([...titleTags, ...sectionTags]),
        targetDate,
      });
    }
  }

  if (!screenings.length) {
    throw new Error(`No Piccadilly screenings found for ${targetDate}`);
  }

  return buildImportPayload(SHINJUKU_THEATERS.piccadilly, screenings);
}
