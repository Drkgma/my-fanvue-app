import Image from "next/image";
import { getAccount, getCurrentUser, getPostsPreview, getSessionScopes } from "@/lib/fanvue";
import { GROWTH_LADDER, PHASE0_SCOPES, TWENTY_FOUR_HOUR } from "@/lib/growth";
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
  const fans = account?.account?.fans;
  const subscribers = Number(fans?.subscribers || 0);
  const followers = Number(fans?.followers || 0);
  const postCount = posts?.data?.length ?? null;
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

        <section className="rounded-xl border border-black/10 dark:border-white/15 p-5">
          <p className="text-sm opacity-70">
            This is a beginner account. The first win is <strong>10 subscribers</strong>, not
            $1M/month. Phase 0 work is auth, a content bank, and five public teasers.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-black/[.04] dark:bg-white/[.06] p-3">
              <dt className="text-xs opacity-60">Subscribers</dt>
              <dd className="text-2xl font-semibold">
                {isAuthed ? subscribers : "—"}
                <span className="text-sm font-normal opacity-50"> / {target}</span>
              </dd>
            </div>
            <div className="rounded-lg bg-black/[.04] dark:bg-white/[.06] p-3">
              <dt className="text-xs opacity-60">Followers</dt>
              <dd className="text-2xl font-semibold">{isAuthed ? followers : "—"}</dd>
            </div>
            <div className="rounded-lg bg-black/[.04] dark:bg-white/[.06] p-3">
              <dt className="text-xs opacity-60">Earnings</dt>
              <dd className="text-2xl font-semibold">
                {isAuthed ? cents(account?.account?.earnings?.total) : "—"}
              </dd>
            </div>
            <div className="rounded-lg bg-black/[.04] dark:bg-white/[.06] p-3">
              <dt className="text-xs opacity-60">Posts (page 1)</dt>
              <dd className="text-2xl font-semibold">{postCount ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-black/10 dark:border-white/15 p-5">
          <h2 className="font-semibold">24-hour list</h2>
          <ol className="mt-3 space-y-3">
            {TWENTY_FOUR_HOUR.map((item, index) => {
              const done =
                (item.id === "auth" && isAuthed) ||
                (item.id === "upload" && (postCount ?? 0) > 0) ||
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
                  <button className="rounded-full border px-4 h-10 text-sm">
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
