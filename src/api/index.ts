import type { AppEnv } from "../db/client";
import { routeRequest } from "./router";
import { updateScreeningsJob } from "../jobs/updateScreenings";

export default {
  async fetch(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return routeRequest(request, env, ctx);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
  async scheduled(_event: ScheduledEvent, env: AppEnv, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(updateScreeningsJob(env));
  },
};
