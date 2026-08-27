import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function tokenPayload(session: {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType?: string;
  scope?: string;
}) {
  return {
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    token_type: session.tokenType,
    scope: session.scope,
    expires_at: session.expiresAt,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const body = JSON.stringify(tokenPayload(session), null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=tokens.json",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const destDir = path.join(process.cwd(), "fanvue-automation");
  const dest = path.join(destDir, "tokens.json");
  await mkdir(destDir, { recursive: true });
  await writeFile(dest, JSON.stringify(tokenPayload(session), null, 2), { mode: 0o600 });
  return NextResponse.redirect(new URL("/?tokens=saved", request.url));
}
