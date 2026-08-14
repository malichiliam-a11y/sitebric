// Canonical origin, used for metadataBase, sitemap and robots.
//
// Hard-coded rather than read from an env var because it must be correct
// at build time on every deploy — a missing variable would silently emit
// preview URLs into the sitemap and the OG tags, which is worse than being
// unable to override it.
export const SITE_URL = "https://sitebric.com";
