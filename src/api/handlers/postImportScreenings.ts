import type { AppEnv } from "../../db/client";
import { parseImportPayload } from "../../lib/validation";
import { persistManualImport } from "../../services/importScreenings";
import { jsonResponse } from "../router";

export async function postImportScreeningsHandler(request: Request, env: AppEnv): Promise<Response> {
  const rawPayload = await request.json<unknown>();
  const payload = parseImportPayload(rawPayload);
  const imported = await persistManualImport(env, payload);

  return jsonResponse({
    imported,
  });
}
