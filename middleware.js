import { NextResponse } from "next/server";

// Any request whose "host" isn't our own app domain gets treated as a
// client's custom domain, and gets routed to the handler that looks
// up and serves their published site.
const OWN_HOSTS = ["sitebric.com", "www.sitebric.com", "localhost:3000"];

export function middleware(req) {
  const host = req.headers.get("host") || "";
  const isOwnHost = OWN_HOSTS.includes(host) || host.endsWith(".vercel.app");

  if (!isOwnHost) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/custom-domain-site";
    url.searchParams.set("host", host);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
