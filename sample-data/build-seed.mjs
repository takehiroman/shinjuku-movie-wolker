import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function readJson(filePath) {
  const source = await readFile(filePath, "utf8");
  return JSON.parse(source);
}

function sortById(items) {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

function sortTravelTimes(items) {
  return [...items].sort((left, right) => {
    const fromDiff = left.fromTheaterId.localeCompare(right.fromTheaterId);
    if (fromDiff !== 0) {
      return fromDiff;
    }
    return left.toTheaterId.localeCompare(right.toTheaterId);
  });
}

function sortScreenings(items) {
  return [...items].sort((left, right) => {
    const startDiff = left.startAt.localeCompare(right.startAt);
    if (startDiff !== 0) {
      return startDiff;
    }
    return left.id.localeCompare(right.id);
  });
}

function collectUnique(items, key) {
  const map = new Map();
  for (const item of items) {
    map.set(item[key], item);
  }
  return [...map.values()];
}

async function main() {
  const [, , sourceDir, outputFile] = process.argv;

  if (!sourceDir || !outputFile) {
    throw new Error("Usage: node sample-data/build-seed.mjs <sourceDir> <outputFile>");
  }

  const theatersDir = path.join(sourceDir, "theaters");
  const theaterFiles = (await readdir(theatersDir))
    .filter((entry) => entry.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  const theaterPayloads = await Promise.all(
    theaterFiles.map((entry) => readJson(path.join(theatersDir, entry))),
  );
  const travelPayload = await readJson(path.join(sourceDir, "travel-times.json"));

  const theaters = collectUnique(theaterPayloads.map((payload) => payload.theater), "id");
  const movies = collectUnique(theaterPayloads.flatMap((payload) => payload.movies), "id");
  const screenings = theaterPayloads.flatMap((payload) => payload.screenings);
  const theaterIds = new Set(theaters.map((theater) => theater.id));
  const travelTimes = (travelPayload.travelTimes ?? []).filter(
    (travelTime) =>
      theaterIds.has(travelTime.fromTheaterId) && theaterIds.has(travelTime.toTheaterId),
  );

  const output = {
    theaters: sortById(theaters),
    movies: sortById(movies),
    screenings: sortScreenings(screenings),
    travelTimes: sortTravelTimes(travelTimes),
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
