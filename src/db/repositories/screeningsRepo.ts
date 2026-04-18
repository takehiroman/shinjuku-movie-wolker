import type { Screening } from "../../domain/types";
import type { ScreeningJoinedRow } from "../schema";
import { all } from "../client";
import { parseTags, serializeTags } from "../../domain/screening";

function mapRow(row: ScreeningJoinedRow): Screening {
  return {
    id: row.id,
    movieId: row.movie_id,
    movieTitle: row.movie_title,
    theaterId: row.theater_id,
    theaterName: row.theater_name,
    screenName: row.screen_name,
    startAt: row.start_at,
    endAt: row.end_at,
    durationMinutes: row.duration_minutes,
    tags: parseTags(row.tags),
    targetDate: row.target_date,
  };
}

export async function listScreeningsByDate(db: D1Database, targetDate: string): Promise<Screening[]> {
  const rows = await all<ScreeningJoinedRow>(
    db,
    `SELECT
        s.id,
        s.movie_id,
        m.title AS movie_title,
        s.theater_id,
        t.name AS theater_name,
        s.screen_name,
        s.start_at,
        s.end_at,
        s.duration_minutes,
        s.tags,
        s.target_date
      FROM screenings s
      INNER JOIN movies m ON m.id = s.movie_id
      INNER JOIN theaters t ON t.id = s.theater_id
      WHERE s.target_date = ?
      ORDER BY s.start_at ASC, s.id ASC`,
    [targetDate],
  );
  return rows.map(mapRow);
}

export async function deleteScreeningsByDates(db: D1Database, targetDates: string[]): Promise<void> {
  if (!targetDates.length) {
    return;
  }

  await db.batch(
    targetDates.map((targetDate) =>
      db.prepare(`DELETE FROM screenings WHERE target_date = ?`).bind(targetDate),
    ),
  );
}

export async function upsertScreenings(
  db: D1Database,
  screenings: Array<{
    id: string;
    theaterId: string;
    movieId: string;
    screenName?: string | null;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    tags?: string[];
    targetDate: string;
  }>,
  now: string,
  sourceType = "json-import",
): Promise<void> {
  if (!screenings.length) {
    return;
  }

  await db.batch(
    screenings.map((screening) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO screenings (
            id, theater_id, movie_id, screen_name, start_at, end_at,
            duration_minutes, tags, target_date, source_type, source_ref,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM screenings WHERE id = ?), ?), ?)`,
        )
        .bind(
          screening.id,
          screening.theaterId,
          screening.movieId,
          screening.screenName ?? null,
          screening.startAt,
          screening.endAt,
          screening.durationMinutes,
          serializeTags(screening.tags),
          screening.targetDate,
          sourceType,
          screening.id,
          screening.id,
          now,
          now,
        ),
    ),
  );
}
