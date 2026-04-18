import { useEffect } from "react";

const WEB_ANALYTICS_SCRIPT_ID = "cloudflare-web-analytics";
const WEB_ANALYTICS_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

export function WebAnalytics() {
  useEffect(() => {
    const token = import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim();
    if (!token || typeof document === "undefined") {
      return;
    }

    if (document.getElementById(WEB_ANALYTICS_SCRIPT_ID)) {
      return;
    }

    const script = document.createElement("script");
    script.id = WEB_ANALYTICS_SCRIPT_ID;
    script.defer = true;
    script.src = WEB_ANALYTICS_SRC;
    script.setAttribute("data-cf-beacon", JSON.stringify({ token }));
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
