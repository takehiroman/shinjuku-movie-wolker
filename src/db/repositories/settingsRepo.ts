import type { Settings } from "../../domain/types";
import type { UserSettingsRow } from "../schema";
import { DEFAULT_SETTINGS_ID } from "../../lib/constants";
import { first, run } from "../client";

function mapRow(row: UserSettingsRow): Settings {
  return {
    bufferMinutes: row.buffer_minutes,
    enabledTheaterIds: JSON.parse(row.enabled_theater_ids) as string[],
  };
}

export async function getSettingsRow(db: D1Database, id = DEFAULT_SETTINGS_ID): Promise<Settings | null> {
  const row = await first<UserSettingsRow>(
    db,
    `SELECT id, buffer_minutes, enabled_theater_ids, updated_at
     FROM user_settings
     WHERE id = ?`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function upsertSettings(db: D1Database, settings: Settings, now: string, id = DEFAULT_SETTINGS_ID): Promise<void> {
  await run(
    db,
    `INSERT OR REPLACE INTO user_settings (
      id, buffer_minutes, enabled_theater_ids, updated_at
    ) VALUES (?, ?, ?, ?)`,
    [id, settings.bufferMinutes, JSON.stringify(settings.enabledTheaterIds), now],
  );
}
