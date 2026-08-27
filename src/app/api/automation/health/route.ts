import { NextResponse } from "next/server";
import { tokensFileExists } from "@/lib/tokensOnDisk";

export const dynamic = "force-dynamic";

/** Boolean-only health. Does not return token values. */
export async function GET() {
  return NextResponse.json({
    tokensOnDisk: tokensFileExists(),
    deskPort: 3456,
  });
}
