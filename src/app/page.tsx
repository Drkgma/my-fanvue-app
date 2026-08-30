import Link from "next/link";
import { getAccount, getCurrentUser, getPostsPreview, getSessionScopes } from "@/lib/fanvue";
import { GROWTH_LADDER, PHASE0_SCOPES, TWENTY_FOUR_HOUR } from "@/lib/growth";
import { readCurrentPhase, readSubscriberTarget } from "@/lib/phase";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    href: "/operate",
    title: "Operate this page",
    body: "Seed SOP lists and vault folders, siphon top spenders, preview unread chats. Does not auto-send.",
  },
  {
    href: "/clearance",
    title: "Reel Clearance Desk",
    body: "Run a Reel against the Instagram policy pack. Removal, downrank, or clear — with source IDs.",
  },
  {
    href: "/playbooks",
    title: "Fanvue playbooks",
    body: "Lists, first impression, vault labels, and the voice-note bank for chatters.",
  },
  {
    href: "/prompts",
    title: "SFW Reel prompts",
    body: "Timestamped, reference-image prompts that stay inside Instagram-safe clothing and camera rules.",
  },
];

function cents(value: number | undefined): string {
  const n = Number(value || 0);
  return `$${(n / 100).toFixed(2)}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let me = null;
  try {
    me = await getCurrentUser();
  } catch {
    me = null;
  }
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fanvue.svg" alt="Fanvue" width={120} height={28} />
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#49f264]">Phase {phase} desk</p>
          <h1 className="mt-1 text-3xl font-semibold">Creator ops · 1 → {target}</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Phase 0 is auth, a content bank, and five public teasers. Then clear Reels and run the
            page the way chatters need it.
            {isAuthed ? " You are signed in — save tokens for the local agents, or open Operate." : ""}
          </p>
        </div>
        {isAuthed ? (
          <form action="/api/oauth/logout" method="post">
            <button className="rounded-full bg-[#49f264] px-4 py-2 text-sm text-black">Logout</button>
          </form>
        ) : (
          <a className="rounded-full bg-[#49f264] px-4 py-2 text-sm text-black" href="/api/oauth/login">
            Login with Fanvue
          </a>
        )}
      </div>

      {!isAuthed && (errorParam || errorDescriptionParam) ? (
        <p className="text-sm text-red-400">{errorDescriptionParam || errorParam}</p>
      ) : null}

      {tokensSaved ? (
        <p className="rounded-xl border border-[#49f264]/40 bg-[#49f264]/10 px-4 py-3 text-sm">
          Tokens written to fanvue-automation/tokens.json. Run python run.py content next.
        </p>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-zinc-400">
          This is a beginner account. The first win is <strong className="text-zinc-200">10 subscribers</strong>, not
          $1M/month.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Subscribers" value={isAuthed ? `${subscribers} / ${target}` : "—"} />
          <Stat label="Followers" value={isAuthed ? String(followers) : "—"} />
          <Stat label="Earnings" value={isAuthed ? cents(account?.account?.earnings?.total) : "—"} />
          <Stat label="Posts (page 1)" value={postCount != null ? String(postCount) : "—"} />
        </dl>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
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
                    done ? "bg-[#49f264] text-black" : "bg-white/10"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-zinc-400">{item.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="font-semibold">Auth + local agents</h2>
        {!isAuthed ? (
          <p className="text-sm text-zinc-400">
            Login first. Register{" "}
            <code className="text-xs">http://localhost:3000/api/oauth/callback</code> on the Fanvue
            app and request the scopes in <code className="text-xs">.env.example</code>.
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-400">
              Signed in as @{account?.handle || me?.handle || "unknown"}. Download tokens for
              ContentAgent. Do not commit <code>tokens.json</code>.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
                href="/api/automation/tokens"
              >
                Download tokens.json
              </a>
              <form action="/api/automation/tokens" method="post">
                <button className="rounded-full border border-white/15 px-4 py-2 text-sm">
                  Save into fanvue-automation/
                </button>
              </form>
            </div>
            {missingScopes.length > 0 ? (
              <p className="text-sm text-amber-300">
                Missing scopes for upload/chat: {missingScopes.join(", ")}. Add them in the Fanvue
                developer UI, put the same list in <code>OAUTH_SCOPES</code>, then login again.
              </p>
            ) : (
              <p className="text-sm text-zinc-400">Granted scopes look sufficient for Phase 0/1.</p>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold">Growth ladder (do not skip)</h2>
        <div className="mt-3 space-y-2">
          {GROWTH_LADDER.map((row) => (
            <div
              key={row.phase}
              className={`rounded-lg px-3 py-2 text-sm ${
                row.phase === phase
                  ? "bg-[#49f264]/20 ring-1 ring-[#49f264]"
                  : row.phase > phase + 1
                    ? "opacity-40"
                    : "bg-white/5"
              }`}
            >
              <span className="font-medium">
                Phase {row.phase} · {row.label}
              </span>
              <span className="text-zinc-400">
                {" "}
                — {row.subs} · {row.focus}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-[#49f264]/50"
          >
            <h2 className="font-semibold">{tool.title}</h2>
            <p className="mt-2 text-sm text-zinc-400">{tool.body}</p>
          </Link>
        ))}
      </div>

      {isAuthed ? (
        <details className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <summary className="cursor-pointer font-medium">Raw /users/me</summary>
          <pre className="mt-3 overflow-auto rounded-xl bg-black/40 p-4 text-xs text-zinc-400">
            {JSON.stringify(me, null, 2)}
          </pre>
        </details>
      ) : (
        <p className="text-sm text-zinc-500">
          Fanvue login is optional for the desk and playbooks. It is required to operate the live
          account or export tokens for the Python agents.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/30 p-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}
