import { describe, expect, it } from "vitest";
import type { Screening } from "../domain/types";
import { applyScreeningFilters } from "../services/screenings";

const screenings: Screening[] = [
  {
    id: "1",
    movieId: "movie-1",
    movieTitle: "映画A",
    theaterId: "wald9",
    theaterName: "新宿バルト9",
    screenName: "1",
    startAt: "2026-04-18T09:00:00+09:00",
    endAt: "2026-04-18T11:00:00+09:00",
    durationMinutes: 120,
    tags: ["subtitle"],
    targetDate: "2026-04-18",
  },
  {
    id: "2",
    movieId: "movie-2",
    movieTitle: "映画B",
    theaterId: "toho",
    theaterName: "TOHOシネマズ新宿",
    screenName: "2",
    startAt: "2026-04-19T11:00:00+09:00",
    endAt: "2026-04-19T13:00:00+09:00",
    durationMinutes: 120,
    tags: ["dolby"],
    targetDate: "2026-04-19",
  },
];

describe("screening filters", () => {
  it("applies date filtering", () => {
    const result = applyScreeningFilters(screenings, { date: "2026-04-18" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("applies keyword filtering", () => {
    const result = applyScreeningFilters(screenings, { date: "2026-04-19", keyword: "映画B" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("applies theater filtering", () => {
    const result = applyScreeningFilters(screenings, { date: "2026-04-19", theaterIds: ["wald9"] });
    expect(result).toHaveLength(0);
  });

  it("applies start time filtering", () => {
    const result = applyScreeningFilters(screenings, { date: "2026-04-18", startTime: "09:30" });
    expect(result).toHaveLength(0);
  });

  it("applies end time filtering", () => {
    const result = applyScreeningFilters(screenings, { date: "2026-04-18", endTime: "11:30" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});
