import { NextRequest, NextResponse } from "next/server";

// Simple, free alternative to Vercel's (paid-plan-only) Password Protection.
// Set BASIC_AUTH_USER and BASIC_AUTH_PASS in your Vercel project's env vars
// to turn this on. Leave either blank and the app stays open to anyone with
// the URL.
export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  if (!user || !pass) return NextResponse.next();

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const sepIndex = decoded.indexOf(":");
      const suppliedUser = decoded.slice(0, sepIndex);
      const suppliedPass = decoded.slice(sepIndex + 1);
      if (suppliedUser === user && suppliedPass === pass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Bala Ji Stock Book"' },
  });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
