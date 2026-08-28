import { NextResponse } from "next/server";
import { readProgress } from "@/lib/progressOnDisk";
import { tokensFileExists } from "@/lib/tokensOnDisk";

export const dynamic = "force-dynamic";

/** Boolean + last scoreboard. Does not return token values. */
export async function GET() {
  const progress = readProgress();
  return NextResponse.json({
    tokensOnDisk: tokensFileExists(),
    deskPort: 3456,
    progress,
  });
}
