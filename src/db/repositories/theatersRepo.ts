import type { Theater } from "../../domain/types";
import type { TheaterRow } from "../schema";
import { all } from "../client";

function mapRow(row: TheaterRow): Theater {
  return {
    id: row.id,
    name: row.name,
    area: row.area,
    isActive: row.is_active === 1,
  };
}

export async function listTheaters(db: D1Database): Promise<Theater[]> {
  const rows = await all<TheaterRow>(
    db,
    `SELECT id, name, area, is_active, created_at, updated_at
     FROM theaters
     ORDER BY name ASC`,
  );
  return rows.map(mapRow);
}

export async function listActiveTheaters(db: D1Database): Promise<Theater[]> {
  const rows = await all<TheaterRow>(
    db,
    `SELECT id, name, area, is_active, created_at, updated_at
     FROM theaters
     WHERE is_active = 1
     ORDER BY name ASC`,
  );
  return rows.map(mapRow);
}

export async function upsertTheaters(db: D1Database, theaters: Theater[], now: string): Promise<void> {
  if (!theaters.length) {
    return;
  }

  await db.batch(
    theaters.map((theater) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO theaters (
            id, name, area, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM theaters WHERE id = ?), ?), ?)`,
        )
        .bind(
          theater.id,
          theater.name,
          theater.area,
          theater.isActive === false ? 0 : 1,
          theater.id,
          now,
          now,
        ),
    ),
  );
}

export async function deactivateMissingTheaters(
  db: D1Database,
  activeTheaterIds: string[],
  now: string,
): Promise<void> {
  if (!activeTheaterIds.length) {
    await db
      .prepare(`UPDATE theaters SET is_active = 0, updated_at = ?`)
      .bind(now)
      .run();
    return;
  }

  const placeholders = activeTheaterIds.map(() => "?").join(", ");
  await db
    .prepare(
      `UPDATE theaters
       SET is_active = 0, updated_at = ?
       WHERE id NOT IN (${placeholders})`,
    )
    .bind(now, ...activeTheaterIds)
    .run();
}
