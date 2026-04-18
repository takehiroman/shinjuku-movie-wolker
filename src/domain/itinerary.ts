import type { Itinerary, Screening, TravelTime } from "./types";
import { DEFAULT_UNKNOWN_TRAVEL_MINUTES } from "../lib/constants";
import { minutesBetween, toTimestamp } from "../lib/date";

export function buildTravelTimeMap(travelTimes: TravelTime[]): Map<string, number> {
  return new Map(travelTimes.map((travelTime) => [`${travelTime.fromTheaterId}:${travelTime.toTheaterId}`, travelTime.travelMinutes]));
}

export function getTravelMinutes(
  first: Screening,
  second: Screening,
  travelTimeMap: Map<string, number>,
): number {
  if (first.theaterId === second.theaterId) {
    return 0;
  }

  const directKey = `${first.theaterId}:${second.theaterId}`;
  const reverseKey = `${second.theaterId}:${first.theaterId}`;

  return (
    travelTimeMap.get(directKey) ??
    travelTimeMap.get(reverseKey) ??
    DEFAULT_UNKNOWN_TRAVEL_MINUTES
  );
}

export function canChainScreenings(
  first: Screening,
  second: Screening,
  travelMinutes: number,
  bufferMinutes: number,
): boolean {
  const firstEnd = toTimestamp(first.endAt);
  const secondStart = toTimestamp(second.startAt);
  return firstEnd + (travelMinutes + bufferMinutes) * 60000 <= secondStart;
}

export function hasSameMovieTitle(first: Screening, second: Screening): boolean {
  return first.movieTitle.trim().toLocaleLowerCase() === second.movieTitle.trim().toLocaleLowerCase();
}

export function buildItinerary(
  first: Screening,
  second: Screening,
  travelMinutes: number,
  bufferMinutes: number,
): Itinerary {
  const waitMinutes = Math.max(
    0,
    minutesBetween(
      new Date(toTimestamp(first.endAt) + (travelMinutes + bufferMinutes) * 60000).toISOString(),
      second.startAt,
    ),
  );
  const totalMinutes = travelMinutes + bufferMinutes + waitMinutes;
  const sameTheaterPenalty = first.theaterId === second.theaterId ? 0 : 50;
  const secondStartMinute = new Date(second.startAt).getHours() * 60 + new Date(second.startAt).getMinutes();
  const score = waitMinutes * 10000 + travelMinutes * 100 + sameTheaterPenalty + secondStartMinute;

  return {
    firstScreening: first,
    secondScreening: second,
    travelMinutes,
    waitMinutes,
    totalMinutes,
    score,
  };
}

export function compareItineraries(left: Itinerary, right: Itinerary): number {
  if (left.waitMinutes !== right.waitMinutes) {
    return left.waitMinutes - right.waitMinutes;
  }

  if (left.travelMinutes !== right.travelMinutes) {
    return left.travelMinutes - right.travelMinutes;
  }

  const leftSameTheater = left.firstScreening.theaterId === left.secondScreening.theaterId ? 0 : 1;
  const rightSameTheater = right.firstScreening.theaterId === right.secondScreening.theaterId ? 0 : 1;
  if (leftSameTheater !== rightSameTheater) {
    return leftSameTheater - rightSameTheater;
  }

  const secondStartDiff = toTimestamp(left.secondScreening.startAt) - toTimestamp(right.secondScreening.startAt);
  if (secondStartDiff !== 0) {
    return secondStartDiff;
  }

  return left.score - right.score;
}
