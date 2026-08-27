import Image from "next/image";
import { SiteNav } from "@/app/components/site-nav";
import { OpsDashboard } from "@/app/ops/dashboard";
import { getCurrentUser, getSessionTokens } from "@/lib/fanvue";
import { explainOauthError } from "@/lib/oauth-errors";
import { runTick } from "@/lib/ops/orchestrator";
import { buildOpsStatus } from "@/lib/ops/status";
import { loadState } from "@/lib/ops/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const errorParam = typeof params?.error === "string" ? params.error : undefined;
  const errorDescriptionParam =
    typeof params?.error_description === "string" ? params.error_description : undefined;
  const oauthError = explainOauthError(errorParam, errorDescriptionParam);

  const user = await getCurrentUser();
  const session = await getSessionTokens();
  let state = await loadState();
  let report = null;
  if (!state.lastTickAt) {
    const ticked = await runTick({ user, session });
    state = ticked.state;
    report = ticked.report;
  }
  const status = await buildOpsStatus({ user, session });

  return (
    <div className="font-sans min-h-screen p-6 sm:p-10 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Image src="/logo192.png" alt="Fanvue" width={140} height={30} priority />
          <div>
            <h1 className="text-lg font-semibold">Creator ops</h1>
            <p className="text-xs opacity-70">Phase 0/1 beginner stack — drafts only until you log in</p>
          </div>
        </div>
        <SiteNav current="ops" />
      </header>
      <OpsDashboard
        initialStatus={status}
        initialState={state}
        initialReport={report}
        oauthError={oauthError}
      />
    </div>
  );
}
