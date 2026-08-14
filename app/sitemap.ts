import type { MetadataRoute } from "next";
import { AUDIENCES } from "@/lib/audiences";
import { SITE_URL } from "@/lib/site";

// Public, indexable routes only. The dashboard, admin, auth and demo-result
// pages are deliberately absent — they're either private, per-user, or
// ephemeral, and listing them would invite crawlers into pages that can
// only 404 or redirect.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/pricing", "/demo", "/terms", "/privacy"];

  return [
    ...staticRoutes.map((path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...AUDIENCES.map((a) => ({
      url: `${SITE_URL}/for/${a.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
