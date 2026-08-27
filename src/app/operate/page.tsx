"use client";

import { useEffect, useState } from "react";

type Status = {
  configured?: boolean;
  signedIn?: boolean;
  blockers?: string[];
  account?: {
    handle?: string;
    displayName?: string;
    bio?: string;
    account?: {
      status?: string;
      subscriptionPrice?: number | null;
      earnings?: { total?: number; availableBalance?: number };
      fans?: { followers?: number; subscribers?: number };
    };
    error?: unknown;
  };
  unread?: {
    unreadChatsCount?: number;
    unreadMessagesCount?: number;
    unreadNotifications?: Record<string, number>;
    error?: unknown;
  };
  lists?: Array<{ name?: string; membersCount?: number }>;
  vault?: Array<{ name?: string; mediaCount?: number }>;
  spenders?: Array<{
    gross?: number;
    net?: number;
    messages?: number;
    user?: { handle?: string; displayName?: string; uuid?: string };
  }>;
  promotions?: Array<{ type?: string; freeTrialDays?: number | null; availableToGroup?: string; message?: string }>;
  freeTrialLinks?: Array<{ url?: string; trialDurationDays?: number | null; name?: string }>;
  inbox?: Array<{
    handle?: string;
    displayName?: string;
    unreadMessagesCount?: number;
    lastText?: string | null;
  }>;
  missingLists?: string[];
  missingFolders?: string[];
  hasFourteenDayTrial?: boolean;
  errors?: Record<string, unknown>;
};

function cents(value?: number | null) {
  if (value == null) return "—";
  return `$${(value / 100).toFixed(2)}`;
}

export default function OperatePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState("");

  const load = async () => {
    const res = await fetch("/api/ops/status", { cache: "no-store" });
    setStatus(await res.json());
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (path: string, label: string) => {
    setBusy(label);
    setResult("");
    try {
      const res = await fetch(path, { method: "POST" });
      const body = await res.json();
      setResult(JSON.stringify(body, null, 2));
      await load();
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy("");
    }
  };

  if (!status) return <p className="text-sm text-zinc-400">Loading operator snapshot…</p>;

  const blocked = !status.signedIn;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#49f264]">Live</p>
          <h1 className="mt-1 text-3xl font-semibold">Operate the page</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Seeds chatter lists and vault folders from the SOP, siphons the current top 10 spenders into spend buckets
            plus Inner Circle, and can start a 14-day trial for new subscribers. Inbox is read-only — nothing is sent
            until you approve it.
          </p>
        </div>
        {status.signedIn ? (
          <form action="/api/oauth/logout" method="post">
            <button className="rounded-full bg-white/10 px-4 py-2 text-sm">Logout</button>
          </form>
        ) : status.configured ? (
          <a className="rounded-full bg-[#49f264] px-4 py-2 text-sm text-black" href="/api/oauth/login">
            Login with Fanvue
          </a>
        ) : null}
      </div>

      {status.blockers?.length ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          <p className="font-medium">Cannot hit the live account yet</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {status.blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {!blocked && status.account && !("error" in status.account && status.account.error) ? (
        <section className="grid gap-3 sm:grid-cols-4">
          <Stat label="Handle" value={`@${status.account.handle ?? ""}`} />
          <Stat label="Subscribers" value={String(status.account.account?.fans?.subscribers ?? "—")} />
          <Stat label="Price" value={cents(status.account.account?.subscriptionPrice)} />
          <Stat label="Unread chats" value={String(status.unread?.unreadChatsCount ?? "—")} />
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={blocked || Boolean(busy)}
          onClick={() => run("/api/ops/seed", "seed")}
          className="rounded-full bg-[#49f264] px-4 py-2 text-sm text-black disabled:opacity-40"
        >
          {busy === "seed" ? "Seeding…" : "Seed lists + vault"}
        </button>
        <button
          type="button"
          disabled={blocked || Boolean(busy)}
          onClick={() => run("/api/ops/siphon", "siphon")}
          className="rounded-full bg-white px-4 py-2 text-sm text-black disabled:opacity-40"
        >
          {busy === "siphon" ? "Siphoning…" : "Siphon top 10 spenders"}
        </button>
        <button
          type="button"
          disabled={blocked || Boolean(busy) || status.hasFourteenDayTrial}
          onClick={() => run("/api/ops/trial", "trial")}
          className="rounded-full bg-white/10 px-4 py-2 text-sm disabled:opacity-40"
        >
          {status.hasFourteenDayTrial
            ? "14-day trial already live"
            : busy === "trial"
              ? "Creating trial…"
              : "Create 14-day trial"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void load()}
          className="rounded-full bg-white/10 px-4 py-2 text-sm"
        >
          Refresh
        </button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Custom lists" missing={status.missingLists}>
          {(status.lists ?? []).map((list) => (
            <li key={String(list.name)}>
              {list.name} · {list.membersCount ?? 0}
            </li>
          ))}
        </Card>
        <Card title="Vault folders" missing={status.missingFolders}>
          {(status.vault ?? []).map((folder) => (
            <li key={String(folder.name)}>
              {folder.name} · {folder.mediaCount ?? 0} items
            </li>
          ))}
        </Card>
        <Card title="Top spenders">
          {(status.spenders ?? []).map((row) => (
            <li key={row.user?.uuid ?? row.user?.handle}>
              {row.user?.displayName ?? row.user?.handle} · {cents(row.gross)} gross · {row.messages ?? 0} msgs
            </li>
          ))}
        </Card>
        <Card title="Promo / trials">
          {(status.promotions ?? []).map((promo, index) => (
            <li key={`p-${index}`}>
              {promo.type}
              {promo.freeTrialDays ? ` · ${promo.freeTrialDays} days` : ""} · {promo.availableToGroup} ·{" "}
              {promo.message ?? "no message"}
            </li>
          ))}
          {(status.freeTrialLinks ?? []).map((link) => (
            <li key={link.url}>
              trial link {link.trialDurationDays ?? "?"}d · {link.name ?? "unnamed"}
            </li>
          ))}
        </Card>
        <Card title="Unread inbox (read-only)">
          {(status.inbox ?? []).map((chat) => (
            <li key={String(chat.handle)}>
              {chat.displayName ?? chat.handle} · {chat.unreadMessagesCount ?? 0} unread
              {chat.lastText ? ` — ${chat.lastText}` : ""}
            </li>
          ))}
        </Card>
      </div>

      {status.account?.bio ? (
        <p className="text-sm text-zinc-400">
          Bio now: <span className="text-zinc-200">{status.account.bio}</span>
        </p>
      ) : null}

      {result ? (
        <pre className="overflow-auto rounded-xl bg-black/40 p-4 text-xs text-zinc-400">{result}</pre>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  );
}

function Card({
  title,
  missing,
  children,
}: {
  title: string;
  missing?: string[];
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="font-semibold">{title}</h2>
      {missing?.length ? (
        <p className="mt-1 text-xs text-amber-300">Missing: {missing.join(", ")}</p>
      ) : null}
      <ul className="mt-2 space-y-1 text-sm text-zinc-300">{children}</ul>
    </article>
  );
}
