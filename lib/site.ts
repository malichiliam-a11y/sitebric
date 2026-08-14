// Canonical origin, used for metadataBase, sitemap and robots.
//
// Hard-coded rather than read from an env var because it must be correct
// at build time on every deploy — a missing variable would silently emit
// preview URLs into the sitemap and the OG tags, which is worse than being
// unable to override it.
// www, not the apex: sitebric.com 308-redirects to www.sitebric.com, so
// canonical tags and sitemap entries built on the apex all point at a
// redirect rather than the page that actually answers. Bare sitebric.com
// links still work — they just take the extra hop.
export const SITE_URL = "https://www.sitebric.com";
