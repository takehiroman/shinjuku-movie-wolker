import type { AppEnv } from "../../db/client";
import { updateScreeningsJob } from "../../jobs/updateScreenings";
import { ValidationError } from "../../lib/validation";
import { jsonResponse } from "../router";

export async function postRunSyncHandler(request: Request, env: AppEnv): Promise<Response> {
  const providedToken = request.headers.get("x-admin-token");
  if (!env.ADMIN_SYNC_TOKEN) {
    throw new ValidationError("admin sync token is not configured", 503);
  }

  if (!providedToken || providedToken !== env.ADMIN_SYNC_TOKEN) {
    throw new ValidationError("unauthorized", 401);
  }

  await updateScreeningsJob(env);
  return jsonResponse({
    ok: true,
    syncedAt: new Date().toISOString(),
  });
}
