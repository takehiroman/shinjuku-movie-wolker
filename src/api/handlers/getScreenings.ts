import type { AppEnv } from "../../db/client";
import { parseScreeningFilters } from "../../lib/validation";
import { getScreenings } from "../../services/screenings";
import { jsonResponse } from "../router";

export async function getScreeningsHandler(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url);
  const filters = parseScreeningFilters(url.searchParams);
  const response = await getScreenings(env, filters);
  return jsonResponse(response);
}
