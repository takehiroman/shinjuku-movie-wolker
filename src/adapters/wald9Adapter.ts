import type { AppEnv } from "../db/client";
import type { ImportPayload, ImportedCounts } from "../domain/types";
import { tomorrowDateStringInTimeZone } from "../lib/date";
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
  pdfData: Uint8Array;
  targetDate: string;
}

const WALD9_PDF_URL =
  "https://tjoy.jp/pdf/schedule_pdf/140/%DATE%/1/null/schedule_%DATE%.pdf";

export const wald9Adapter: TheaterAdapter<Wald9Raw> = {
  name: "wald9-pdf",
  async fetchRaw(): Promise<Wald9Raw> {
    const targetDate = tomorrowDateStringInTimeZone("Asia/Tokyo");
    const response = await fetch(WALD9_PDF_URL.replaceAll("%DATE%", targetDate), {
      headers: {
        "user-agent": "ShinjukuMovieWolkerBot/0.1 (+https://github.com/takehiroman/shinjuku-movie-wolker)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Wald9 schedule PDF: ${response.status}`);
    }

    return {
      pdfData: new Uint8Array(await response.arrayBuffer()),
      targetDate,
    };
  },
  async normalize(raw: Wald9Raw): Promise<ImportPayload> {
    return normalizeWald9Pdf(raw.pdfData, raw.targetDate);
  },
  async save(env: AppEnv, payload: ImportPayload): Promise<ImportedCounts> {
    return persistAdapterImport(env, payload, this.name);
  },
};

export async function normalizeWald9Pdf(pdfData: Uint8Array, targetDate: string): Promise<ImportPayload> {
  const lines = await extractWald9PdfLines(pdfData);
  return normalizeWald9PdfText(lines, targetDate);
}

export function normalizeWald9PdfText(lines: string[], targetDate: string): ImportPayload {
  const screenings: Array<{
    movieTitle: string;
    screenName: string | null;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    tags: string[];
    targetDate: string;
  }> = [];

  let currentTitle = "";
  let currentDuration = 0;
  let currentTags: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = normalizeWhitespace(lines[index]);
    if (!line || shouldIgnorePdfLine(line)) {
      continue;
    }

    const titleMatch = line.match(/^(.*)（(\d+)分）$/u);
    if (titleMatch) {
      const parsed = parseWald9PdfTitle(titleMatch[1]);
      currentTitle = parsed.title;
      currentDuration = Number.parseInt(titleMatch[2], 10);
      currentTags = parsed.tags;
      continue;
    }

    const timeMatches = [...line.matchAll(/(\d{1,2}:\d{2})～(\d{1,2}:\d{2})/g)];
    if (!timeMatches.length || !currentTitle || !currentDuration) {
      continue;
    }

    const screenLine = normalizeWhitespace(lines[index + 1] ?? "");
    const statusLine = normalizeWhitespace(lines[index + 2] ?? "");
    const screenMatches = [...screenLine.matchAll(/シアター\s*[0-9０-９一二三四五六七八九十]+/gu)].map((match) =>
      match[0].replace(/\s+/g, ""),
    );
    const statusMatches = [...statusLine.matchAll(/通常|レイトショー|ミッドナイト/gu)].map((match) => match[0]);

    if (screenMatches.length !== timeMatches.length) {
      continue;
    }

    for (let timeIndex = 0; timeIndex < timeMatches.length; timeIndex += 1) {
      const timeMatch = timeMatches[timeIndex];
      const range = parseTimeRange(targetDate, timeMatch[1], timeMatch[2]);
      screenings.push({
        movieTitle: currentTitle,
        screenName: screenMatches[timeIndex] ?? null,
        startAt: range.startAt,
        endAt: range.endAt,
        durationMinutes: currentDuration,
        tags: normalizeTags([
          ...currentTags,
          ...(statusMatches[timeIndex] && statusMatches[timeIndex] !== "通常" ? [statusMatches[timeIndex]] : []),
        ]),
        targetDate,
      });
    }
  }

  if (!screenings.length) {
    throw new Error(`No Wald9 screenings found for ${targetDate}`);
  }

  return buildImportPayload(SHINJUKU_THEATERS.wald9, screenings);
}

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

function parseWald9PdfTitle(rawTitle: string): { title: string; tags: string[] } {
  let title = normalizeWhitespace(rawTitle);
  const tags: string[] = [];

  title = title.replace(/^((?:【[^】]+】\s*)+)/u, (labelGroup) => {
    for (const label of labelGroup.matchAll(/【([^】]+)】/gu)) {
      tags.push(label[1]);
    }
    return "";
  });

  title = title.replace(/\[(PG12|R15\+|R18\+)\]/giu, (_match, rating: string) => {
    tags.push(rating);
    return "";
  });

  return {
    title: normalizeWhitespace(title),
    tags: normalizeTags(tags),
  };
}

function shouldIgnorePdfLine(line: string): boolean {
  return [
    /上映スケジュール/u,
    /開館/u,
    /^【お知らせ】/u,
    /^■/u,
    /^※/u,
    /^＜/u,
    /^混雑状況/u,
    /^一律/u,
  ].some((pattern) => pattern.test(line));
}

interface PdfObject {
  body: string;
  stream: Uint8Array | null;
  usesFlateDecode: boolean;
}

interface PdfTextItem {
  x: number;
  y: number;
  text: string;
}

async function extractWald9PdfLines(pdfData: Uint8Array): Promise<string[]> {
  const objects = parsePdfObjects(pdfData);
  const fontMaps = await buildPdfFontMaps(objects);
  const items: PdfTextItem[] = [];

  for (const pdfObject of objects.values()) {
    if (!pdfObject.stream) {
      continue;
    }

    const decodedStream = pdfObject.usesFlateDecode ? await inflatePdfStream(pdfObject.stream) : pdfObject.stream;
    const streamText = decodeLatin1(decodedStream);
    if (!streamText.includes("BT") || !streamText.includes("Tf")) {
      continue;
    }

    items.push(...extractPdfTextItems(streamText, fontMaps));
  }

  const lineMap = new Map<number, Array<{ x: number; text: string }>>();
  for (const item of items) {
    const y = Math.round(item.y * 10);
    const row = lineMap.get(y) ?? [];
    row.push({ x: item.x, text: item.text });
    lineMap.set(y, row);
  }

  return [...lineMap.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([, row]) =>
      row
        .sort((left, right) => left.x - right.x)
        .map((item) => item.text)
        .join(""),
    )
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

function parsePdfObjects(pdfData: Uint8Array): Map<number, PdfObject> {
  const pdfText = decodeLatin1(pdfData);
  const objects = new Map<number, PdfObject>();
  const objectPattern = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;

  for (const match of pdfText.matchAll(objectPattern)) {
    const objectId = Number.parseInt(match[1], 10);
    const body = match[2];
    const streamMatch = body.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);

    objects.set(objectId, {
      body,
      stream: streamMatch ? encodeLatin1(streamMatch[1]) : null,
      usesFlateDecode: body.includes("/FlateDecode"),
    });
  }

  return objects;
}

async function buildPdfFontMaps(objects: Map<number, PdfObject>): Promise<Map<string, Map<string, string>>> {
  const fontRefs = new Map<string, number>();

  for (const pdfObject of objects.values()) {
    const fontSection = pdfObject.body.match(/\/Font\s*<<([\s\S]*?)>>/);
    if (!fontSection) {
      continue;
    }

    for (const fontMatch of fontSection[1].matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
      fontRefs.set(fontMatch[1], Number.parseInt(fontMatch[2], 10));
    }
  }

  const fontMaps = new Map<string, Map<string, string>>();
  for (const [fontName, fontObjectId] of fontRefs.entries()) {
    const fontObject = objects.get(fontObjectId);
    const toUnicodeMatch = fontObject?.body.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
    if (!toUnicodeMatch) {
      continue;
    }

    const cmapObject = objects.get(Number.parseInt(toUnicodeMatch[1], 10));
    if (!cmapObject?.stream) {
      continue;
    }

    const cmapBytes = cmapObject.usesFlateDecode ? await inflatePdfStream(cmapObject.stream) : cmapObject.stream;
    fontMaps.set(fontName, parsePdfCMap(decodeLatin1(cmapBytes)));
  }

  return fontMaps;
}

function parsePdfCMap(cmapText: string): Map<string, string> {
  const charMap = new Map<string, string>();

  for (const bfcharBlock of cmapText.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const entry of bfcharBlock[1].matchAll(/<([0-9A-F]+)>\s+<([0-9A-F]+)>/gi)) {
      charMap.set(entry[1].toUpperCase(), decodeUtf16Hex(entry[2]));
    }
  }

  return charMap;
}

function extractPdfTextItems(streamText: string, fontMaps: Map<string, Map<string, string>>): PdfTextItem[] {
  const items: PdfTextItem[] = [];
  let currentFont = "";
  let currentX = 0;
  let currentY = 0;

  const tokenPattern =
    /\/(F\d+)\s+[-\d.]+\s+Tf|([-\d.]+)\s+([-\d.]+)\s+Td|<([0-9A-F]+)>\s*Tj|\[((?:[^[\]]|\[[^[\]]*\])*)\]\s*TJ/g;

  for (const match of streamText.matchAll(tokenPattern)) {
    if (match[1]) {
      currentFont = match[1];
      continue;
    }

    if (match[2] && match[3]) {
      currentX = Number.parseFloat(match[2]);
      currentY = Number.parseFloat(match[3]);
      continue;
    }

    if (match[4]) {
      const text = decodePdfHexString(match[4], fontMaps.get(currentFont));
      if (text) {
        items.push({ x: currentX, y: currentY, text });
      }
      continue;
    }

    if (match[5]) {
      const text = [...match[5].matchAll(/<([0-9A-F]+)>/gi)]
        .map((part) => decodePdfHexString(part[1], fontMaps.get(currentFont)))
        .join("");

      if (text) {
        items.push({ x: currentX, y: currentY, text });
      }
    }
  }

  return items;
}

function decodePdfHexString(hex: string, fontMap?: Map<string, string>): string {
  if (!fontMap) {
    return "";
  }

  const normalizedHex = hex.toUpperCase();
  const characters: string[] = [];

  for (let index = 0; index < normalizedHex.length; index += 2) {
    const code = normalizedHex.slice(index, index + 2);
    characters.push(fontMap.get(code) ?? "");
  }

  return normalizeWhitespace(characters.join(""));
}

function decodeUtf16Hex(hex: string): string {
  const bytes = new Uint8Array(hex.match(/../g)?.map((chunk) => Number.parseInt(chunk, 16)) ?? []);
  return new TextDecoder("utf-16be").decode(bytes);
}

function decodeLatin1(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

function encodeLatin1(value: string): Uint8Array {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}

async function inflatePdfStream(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream("deflate");
  const writer = stream.writable.getWriter();
  const normalized = Uint8Array.from(bytes);
  await writer.write(normalized.buffer);
  await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}
