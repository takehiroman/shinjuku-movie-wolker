import type { AppEnv } from "../../db/client";
import { parseItineraryFilters } from "../../lib/validation";
import { getItineraries } from "../../services/itineraries";
import { jsonResponse } from "../router";

export async function getItinerariesHandler(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url);
  const filters = parseItineraryFilters(url.searchParams);
  const response = await getItineraries(env, filters);
  return jsonResponse(response);
}
