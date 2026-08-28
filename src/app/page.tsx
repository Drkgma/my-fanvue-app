import Image from "next/image";
import { getAccount, getCurrentUser, getPostsPreview, getSessionScopes } from "@/lib/fanvue";
import { GROWTH_LADDER, PHASE0_SCOPES, TWENTY_FOUR_HOUR } from "@/lib/growth";
import { persistSessionTokens, tokensFileExists } from "@/lib/tokensOnDisk";
import { readProgress } from "@/lib/progressOnDisk";
import { getSession } from "@/lib/session";
import { readPpvCatalog, readPpvScripts } from "@/lib/ppvCatalog";
import { readCurrentPhase, readSubscriberTarget } from "@/lib/phase";

export const dynamic = "force-dynamic";

function cents(value: number | undefined): string {
  const n = Number(value || 0);
  return `$${(n / 100).toFixed(2)}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const me = await getCurrentUser();
  const isAuthed = !!me;
  const account = isAuthed ? await getAccount() : null;
  const posts = isAuthed ? await getPostsPreview() : null;
  const scopes = await getSessionScopes();
  const phase = readCurrentPhase();
  const target = readSubscriberTarget();
  const params = await searchParams;
  const errorParam = typeof params?.error === "string" ? params.error : undefined;
  const errorDescriptionParam =
    typeof params?.error_description === "string" ? params.error_description : undefined;
  const tokensSaved = params?.tokens === "saved";
  const session = await getSession();
  if (session?.accessToken) {
    persistSessionTokens(session);
  }
  const tokensOnDisk = tokensFileExists();
  const progress = readProgress();
  const fans = account?.account?.fans;
  const subscribers = isAuthed ? Number(fans?.subscribers || 0) : progress?.subscribers;
  const followers = isAuthed ? Number(fans?.followers || 0) : progress?.followers;
  const postCount = isAuthed ? (posts?.data?.length ?? null) : (progress?.posts_listed ?? null);
  const leftover = progress?.leftover_teasers;
  const publicUrl = progress?.public_url || "https://www.fanvue.com/funny-kite-83";
  const ppvCatalog = readPpvCatalog();
  const ppvScripts = readPpvScripts();
  const ppvReady = progress?.ppv_ready ?? 0;
  const ppvTotal = progress?.ppv_total ?? ppvCatalog.length;
  const starterReady = progress?.ppv_starter_ready ?? 0;
  const starterTotal = progress?.ppv_starter_total ?? ppvCatalog.length;
  const ppvMissing = new Set(progress?.ppv_missing || ppvCatalog.map((row) => row.id));
  const packReady = new Map((progress?.ppv_packs || []).map((row) => [row.id, row.ready || 0]));
  const missingScopes = PHASE0_SCOPES.filter((scope) => !scopes.includes(scope));

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/fanvue.svg" alt="Fanvue" width={36} height={36} unoptimized />
            <div>
              <p className="text-xs uppercase tracking-wide opacity-60">Phase {phase} desk</p>
              <h1 className="text-xl font-semibold">1 → {target} subscribers</h1>
            </div>
          </div>
          {isAuthed ? (
            <form action="/api/oauth/logout" method="post">
              <button className="rounded-full bg-[#49f264] px-4 h-10 text-black font-medium">
                Logout
              </button>
            </form>
          ) : (
            <a
              className="rounded-full bg-[#49f264] px-4 h-10 text-black font-medium inline-flex items-center"
              href="/api/oauth/login"
            >
              Login with Fanvue
            </a>
          )}
        </header>

        {!isAuthed && (errorParam || errorDescriptionParam) ? (
          <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorDescriptionParam || errorParam}
          </p>
        ) : null}

        {tokensSaved ? (
          <p className="rounded-lg border border-[#49f264] bg-[#49f26422] px-4 py-3 text-sm">
            Tokens written to fanvue-automation/tokens.json. Run python run.py content next.
          </p>
        ) : null}

        {!tokensOnDisk ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>tokens.json is missing on this Cloud Agent.</strong>
            {isAuthed ? (
              <>
                {" "}
                You are signed in. Click the green <strong>Save into fanvue-automation/</strong>{" "}
                button below, or refresh this page once.
              </>
            ) : (
              <>
                {" "}
                Click <strong>Login with Fanvue</strong>, then{" "}
                <strong>Save into fanvue-automation/</strong>. n8n on port 5678 is a different
                machine.
              </>
            )}
          </p>
        ) : (
          <p className="rounded-lg border border-[#49f264] bg-[#49f26422] px-4 py-3 text-sm">
            tokens.json is present on this VM. ContentAgent can run.
          </p>
        )}

        <section className="rounded-xl border border-black/10 dark:border-white/15 p-5">
          <p className="text-sm opacity-70">
            This is a beginner account. The first win is <strong>10 subscribers</strong>, not
            $1M/month. Teasers are live. More posts will not create subscribers until people
            see{" "}
            <a className="underline" href={publicUrl} target="_blank" rel="noreferrer">
              {publicUrl.replace("https://", "")}
            </a>
            .
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-black/[.04] dark:bg-white/[.06] p-3">
              <dt className="text-xs opacity-60">Subscribers</dt>
              <dd className="text-2xl font-semibold">
                {subscribers ?? "—"}
                <span className="text-sm font-normal opacity-50"> / {target}</span>
              </dd>
            </div>
            <div className="rounded-lg bg-black/[.04] dark:bg-white/[.06] p-3">
              <dt className="text-xs opacity-60">Followers</dt>
              <dd className="text-2xl font-semibold">{followers ?? "—"}</dd>
            </div>
            <div className="rounded-lg bg-black/[.04] dark:bg-white/[.06] p-3">
              <dt className="text-xs opacity-60">Earnings</dt>
              <dd className="text-2xl font-semibold">
                {isAuthed
                  ? cents(account?.account?.earnings?.total)
                  : progress?.earnings_cents != null
                    ? cents(progress.earnings_cents)
                    : "—"}
              </dd>
            </div>
            <div className="rounded-lg bg-black/[.04] dark:bg-white/[.06] p-3">
              <dt className="text-xs opacity-60">Posts live</dt>
              <dd className="text-2xl font-semibold">{postCount ?? "—"}</dd>
            </div>
            <div className="rounded-lg bg-black/[.04] dark:bg-white/[.06] p-3">
              <dt className="text-xs opacity-60">Leftover teasers</dt>
              <dd className="text-2xl font-semibold">{leftover ?? "—"}</dd>
            </div>
            <div className="rounded-lg bg-black/[.04] dark:bg-white/[.06] p-3">
              <dt className="text-xs opacity-60">Content bank</dt>
              <dd className="text-2xl font-semibold">{progress?.bank ?? "—"}</dd>
            </div>
          </dl>
          {progress?.at ? (
            <p className="mt-3 text-xs opacity-50">Last automation snapshot {progress.at}</p>
          ) : null}
        </section>

        <section className="rounded-xl border border-black/10 dark:border-white/15 p-5 space-y-3">
          <h2 className="font-semibold">Share to get subscribers</h2>
          <p className="text-sm opacity-70">
            Fanvue will not send traffic to 0 followers. Copy the link. Ads and TrafficAgent
            stay off until 10 subscribers.
          </p>
          <p className="break-all rounded-lg bg-black/[.04] dark:bg-white/[.06] px-3 py-2 text-sm">
            {publicUrl}
          </p>
          <p className="text-sm opacity-70">
            Copy-paste caption: <em>hi, it&apos;s me — more on the page if you want it</em>
          </p>
          {progress?.share_note ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">{progress.share_note}</p>
          ) : null}
        </section>

        <section className="rounded-xl border border-black/10 dark:border-white/15 p-5 space-y-3">
          <h2 className="font-semibold">PPV starter pack</h2>
          <p className="text-sm opacity-70">
            From the new-account shot list. Drop <strong>your own</strong> files into{" "}
            <code className="text-xs">fanvue-automation/ppv_bank/</code>. Public teasers stay
            clothed. This desk will not generate nudes or sex clips. Chat PPV DMs stay off
            until 5 subscribers.
          </p>
          <p className="text-2xl font-semibold">
            {starterReady} / {starterTotal || 16}
            <span className="ml-2 text-sm font-normal opacity-60">starter files ready</span>
          </p>
          <p className="text-sm opacity-70">
            All SKUs (starter + scripts): {ppvReady} / {ppvTotal || 16}
          </p>
          {progress?.ppv_posted != null ? (
            <p className="text-sm opacity-70">Wall unlocks posted: {progress.ppv_posted}</p>
          ) : null}
          <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {ppvCatalog.map((row) => {
              const ready = !ppvMissing.has(row.id);
              return (
                <li key={row.id} className={ready ? "opacity-100" : "opacity-60"}>
                  {ready ? "✓" : "○"} {row.label} · ${(row.price_cents / 100).toFixed(2)} ·{" "}
                  <code className="text-xs">
                    {row.filename}.{row.kind === "video" ? "mp4" : "jpg"}
                  </code>
                </li>
              );
            })}
          </ul>
          <h3 className="pt-2 font-medium">Film-it-yourself scripts</h3>
          <p className="text-sm opacity-70">
            Name files like <code className="text-xs">s1-v4-dildo.mp4</code>. I will not
            generate these clips. Reddit / leak-site copies stay out.
          </p>
          <ul className="space-y-1 text-sm">
            {ppvScripts.map((pack) => {
              const ready = packReady.get(pack.id) ?? 0;
              return (
                <li key={pack.id}>
                  {ready >= pack.total && pack.total > 0 ? "✓" : "○"} {pack.title} · {ready}/
                  {pack.total} · bundle ${(pack.bundle_price_cents / 100).toFixed(0)}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-black/10 dark:border-white/15 p-5">
          <h2 className="font-semibold">24-hour list</h2>
          <ol className="mt-3 space-y-3">
            {TWENTY_FOUR_HOUR.map((item, index) => {
              const done =
                (item.id === "auth" && (isAuthed || tokensOnDisk)) ||
                (item.id === "upload" && ((progress?.bank ?? 0) >= 20 || (postCount ?? 0) > 0)) ||
                (item.id === "teasers" && (postCount ?? 0) >= 5) ||
                (item.id === "chat" && phase >= 1);
              return (
                <li key={item.id} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      done ? "bg-[#49f264] text-black" : "bg-black/10 dark:bg-white/10"
                    }`}
                  >
                    {done ? "✓" : index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm opacity-70">{item.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-xl border border-black/10 dark:border-white/15 p-5">
          <h2 className="font-semibold">Growth ladder (do not skip)</h2>
          <div className="mt-3 space-y-2">
            {GROWTH_LADDER.map((row) => (
              <div
                key={row.phase}
                className={`rounded-lg px-3 py-2 text-sm ${
                  row.phase === phase
                    ? "bg-[#49f26433] ring-1 ring-[#49f264]"
                    : row.phase > phase + 1
                      ? "opacity-40"
                      : "bg-black/[.03] dark:bg-white/[.04]"
                }`}
              >
                <span className="font-medium">
                  Phase {row.phase} · {row.label}
                </span>
                <span className="opacity-70">
                  {" "}
                  — {row.subs} · {row.focus}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-black/10 dark:border-white/15 p-5 space-y-3">
          <h2 className="font-semibold">Auth + local agents</h2>
          {!isAuthed ? (
            <p className="text-sm opacity-70">
              Login first on <strong>this</strong> Cloud Agent desk (port 3456), then click
              Save tokens until the URL includes <code className="text-xs">?tokens=saved</code>.
              Completing a Cursor setup action, or logging in on Windows/n8n, does not copy
              tokens here. The registered callback is{" "}
              <code className="text-xs">http://localhost:3456/callback</code>.
            </p>
          ) : (
            <>
              <p className="text-sm opacity-70">
                Signed in as @{account?.handle || me?.handle || "unknown"}. Download tokens for
                ContentAgent on your Windows machine. Do not commit <code>tokens.json</code>.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  className="rounded-full border px-4 h-10 inline-flex items-center text-sm"
                  href="/api/automation/tokens"
                >
                  Download tokens.json
                </a>
                <form action="/api/automation/tokens" method="post">
                  <button className="rounded-full bg-[#49f264] px-4 h-10 text-sm text-black font-medium">
                    Save into fanvue-automation/
                  </button>
                </form>
              </div>
              {missingScopes.length > 0 ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Missing scopes for upload/chat: {missingScopes.join(", ")}. Add them in the
                  Fanvue developer UI, put the same list in <code>OAUTH_SCOPES</code>, then login
                  again.
                </p>
              ) : (
                <p className="text-sm opacity-70">Granted scopes look sufficient for Phase 0/1.</p>
              )}
            </>
          )}
        </section>

        {isAuthed ? (
          <details className="rounded-xl border border-black/10 dark:border-white/15 p-5">
            <summary className="cursor-pointer font-medium">Raw /users/me</summary>
            <pre className="mt-3 overflow-auto rounded bg-black/[.05] dark:bg-white/[.06] p-3 text-xs">
              {JSON.stringify(me, null, 2)}
            </pre>
          </details>
        ) : null}

        <footer className="flex gap-4 text-sm opacity-70">
          <a href="https://api.fanvue.com/docs" target="_blank" rel="noreferrer">
            Fanvue API docs
          </a>
          <a href="https://fanvue.com/developers" target="_blank" rel="noreferrer">
            Developer apps
          </a>
        </footer>
      </main>
    </div>
  );
}
