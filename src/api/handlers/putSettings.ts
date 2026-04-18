import type { AppEnv } from "../../db/client";
import { parseSettingsUpdateInput } from "../../lib/validation";
import { updateSettings } from "../../services/settings";
import { jsonResponse } from "../router";

export async function putSettingsHandler(request: Request, env: AppEnv): Promise<Response> {
  const payload = await request.json<unknown>();
  const input = parseSettingsUpdateInput(payload);
  const settings = await updateSettings(env, input);
  return jsonResponse({ settings });
}
