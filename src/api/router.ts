import type { AppEnv } from "../db/client";
import { ValidationError } from "../lib/validation";
import { getScreeningsHandler } from "./handlers/getScreenings";
import { getItinerariesHandler } from "./handlers/getItineraries";
import { getSettingsHandler } from "./handlers/getSettings";
import { putSettingsHandler } from "./handlers/putSettings";
import { postImportScreeningsHandler } from "./handlers/postImportScreenings";
import { postRunSyncHandler } from "./handlers/postRunSync";

type RouteHandler = (request: Request, env: AppEnv, ctx: ExecutionContext) => Promise<Response>;

const routes = new Map<string, RouteHandler>([
  ["GET /api/screenings", getScreeningsHandler],
  ["GET /api/itineraries", getItinerariesHandler],
  ["GET /api/settings", getSettingsHandler],
  ["PUT /api/settings", putSettingsHandler],
  ["POST /api/admin/import-screenings", postImportScreeningsHandler],
  ["POST /api/admin/run-sync", postRunSyncHandler],
]);

export function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });
}

export async function routeRequest(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const routeKey = `${request.method.toUpperCase()} ${url.pathname}`;
  const handler = routes.get(routeKey);

  if (!handler) {
    return jsonResponse({ error: "Not Found" }, { status: 404 });
  }

  try {
    return await handler(request, env, ctx);
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }

    console.error("Unhandled API error", error);
    return jsonResponse({ error: "Internal Server Error" }, { status: 500 });
  }
}
