import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { env } from "@/env";

export async function POST(request: Request) {
  await clearSession();
  return NextResponse.redirect(new URL(`${env.BASE_URL}/`, request.url));
}
