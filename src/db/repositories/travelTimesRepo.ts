import type { TravelTime } from "../../domain/types";
import type { TravelTimeRow } from "../schema";
import { all } from "../client";

function mapRow(row: TravelTimeRow): TravelTime {
  return {
    fromTheaterId: row.from_theater_id,
    toTheaterId: row.to_theater_id,
    travelMinutes: row.travel_minutes,
  };
}

export async function listTravelTimes(db: D1Database): Promise<TravelTime[]> {
  const rows = await all<TravelTimeRow>(
    db,
    `SELECT from_theater_id, to_theater_id, travel_minutes, updated_at
     FROM theater_travel_times
     ORDER BY from_theater_id ASC, to_theater_id ASC`,
  );

  return rows.map(mapRow);
}

export async function upsertTravelTimes(db: D1Database, travelTimes: TravelTime[], now: string): Promise<void> {
  if (!travelTimes.length) {
    return;
  }

  await db.batch(
    travelTimes.map((travelTime) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO theater_travel_times (
            from_theater_id, to_theater_id, travel_minutes, updated_at
          ) VALUES (?, ?, ?, ?)`,
        )
        .bind(
          travelTime.fromTheaterId,
          travelTime.toTheaterId,
          travelTime.travelMinutes,
          now,
        ),
    ),
  );
}
