import type { AppEnv } from "../../db/client";
import { getSettings } from "../../services/settings";
import { jsonResponse } from "../router";

export async function getSettingsHandler(_request: Request, env: AppEnv): Promise<Response> {
  const settings = await getSettings(env);
  return jsonResponse({ settings });
}
