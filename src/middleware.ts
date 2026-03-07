import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const OLD_DOMAINS = [
  "app.alternativeinvestments.io",
  "alternativeinvestments.io",
  "www.alternativeinvestments.io",
  "altvest-subscriber-app.vercel.app",
];

function domainRedirect(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (OLD_DOMAINS.some((d) => host.includes(d))) {
    const url = new URL(request.url);
    url.host = "salesblitz.ai";
    url.protocol = "https";
    return NextResponse.redirect(url.toString(), 301);
  }
  return null;
}

export default clerkMiddleware((auth, request) => {
  const redirect = domainRedirect(request);
  if (redirect) return redirect;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
