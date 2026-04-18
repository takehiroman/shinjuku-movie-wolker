import { describe, expect, it } from "vitest";
import type { Screening } from "../domain/types";
import { buildTravelTimeMap } from "../domain/itinerary";
import { buildItinerariesFromScreenings } from "../services/itineraries";

const sampleScreenings: Screening[] = [
  {
    id: "a",
    movieId: "m1",
    movieTitle: "映画A",
    theaterId: "wald9",
    theaterName: "新宿バルト9",
    screenName: "1",
    startAt: "2026-04-18T09:00:00+09:00",
    endAt: "2026-04-18T11:00:00+09:00",
    durationMinutes: 120,
    tags: [],
    targetDate: "2026-04-18",
  },
  {
    id: "b",
    movieId: "m2",
    movieTitle: "映画B",
    theaterId: "wald9",
    theaterName: "新宿バルト9",
    screenName: "2",
    startAt: "2026-04-18T11:20:00+09:00",
    endAt: "2026-04-18T13:10:00+09:00",
    durationMinutes: 110,
    tags: [],
    targetDate: "2026-04-18",
  },
  {
    id: "c",
    movieId: "m3",
    movieTitle: "映画C",
    theaterId: "toho",
    theaterName: "TOHOシネマズ新宿",
    screenName: "3",
    startAt: "2026-04-18T11:40:00+09:00",
    endAt: "2026-04-18T13:20:00+09:00",
    durationMinutes: 100,
    tags: [],
    targetDate: "2026-04-18",
  },
  {
    id: "d",
    movieId: "m4",
    movieTitle: "映画D",
    theaterId: "piccadilly",
    theaterName: "新宿ピカデリー",
    screenName: "4",
    startAt: "2026-04-18T14:00:00+09:00",
    endAt: "2026-04-18T16:00:00+09:00",
    durationMinutes: 120,
    tags: [],
    targetDate: "2026-04-18",
  },
];

describe("itinerary generation", () => {
  it("allows chaining within the same theater", () => {
    const map = buildTravelTimeMap([]);
    const itineraries = buildItinerariesFromScreenings(sampleScreenings, map, 15);

    expect(itineraries.some((item) => item.firstScreening.id === "a" && item.secondScreening.id === "b")).toBe(true);
  });

  it("allows chaining across theaters when travel time fits", () => {
    const map = buildTravelTimeMap([
      { fromTheaterId: "wald9", toTheaterId: "toho", travelMinutes: 12 },
    ]);
    const itineraries = buildItinerariesFromScreenings(sampleScreenings, map, 15);

    expect(itineraries.some((item) => item.firstScreening.id === "a" && item.secondScreening.id === "c")).toBe(true);
  });

  it("becomes impossible when buffer minutes are too large", () => {
    const map = buildTravelTimeMap([
      { fromTheaterId: "wald9", toTheaterId: "toho", travelMinutes: 12 },
    ]);
    const itineraries = buildItinerariesFromScreenings(sampleScreenings, map, 40);

    expect(itineraries.some((item) => item.firstScreening.id === "a" && item.secondScreening.id === "c")).toBe(false);
  });

  it("returns combinations in prioritized order with earlier second screening first", () => {
    const map = buildTravelTimeMap([
      { fromTheaterId: "wald9", toTheaterId: "toho", travelMinutes: 12 },
      { fromTheaterId: "wald9", toTheaterId: "piccadilly", travelMinutes: 15 },
    ]);
    const itineraries = buildItinerariesFromScreenings(sampleScreenings, map, 15);

    expect(itineraries[0].secondScreening.id).toBe("b");
  });

  it("filters by startScreeningId", () => {
    const map = buildTravelTimeMap([
      { fromTheaterId: "wald9", toTheaterId: "toho", travelMinutes: 12 },
    ]);
    const itineraries = buildItinerariesFromScreenings(sampleScreenings, map, 15, "b");

    expect(itineraries.every((item) => item.firstScreening.id === "b")).toBe(true);
  });
});
