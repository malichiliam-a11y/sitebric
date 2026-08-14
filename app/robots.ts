import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Generated sites live under /s/<id> and belong to the reseller's client,
// not to us — they shouldn't turn up in a search for Sitebric. The rest of
// the disallow list is private or per-user surface area.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/api/", "/reset-password", "/demo/result/", "/s/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
