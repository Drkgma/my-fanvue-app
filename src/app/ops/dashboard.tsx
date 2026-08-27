"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { OpsState } from "@/lib/ops/types";

type Status = Awaited<ReturnType<typeof import("@/lib/ops/status").buildOpsStatus>>;
type Report = Awaited<ReturnType<typeof import("@/lib/ops/orchestrator").runTick>>["report"];

export function OpsDashboard({
  initialStatus,
  initialState,
  initialReport,
  oauthError,
}: {
  initialStatus: Status;
  initialState: OpsState;
  initialReport: Report | null;
  oauthError: { title: string; hint: string; code: string } | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [state, setState] = useState(initialState);
  const [report, setReport] = useState(initialReport);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const envRows = useMemo(
    () => Object.entries(status.envPresent) as [string, boolean][],
    [status.envPresent],
  );

  async function tick() {
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/ops/tick", { method: "POST", headers: { "content-type": "application/json" } });
      const json = await res.json();
      setReport(json);
      const [st, sta] = await Promise.all([
        fetch("/api/ops/state").then((r) => r.json()),
        fetch("/api/ops/status").then((r) => r.json()),
      ]);
      setState(st);
      setStatus(sta);
      setFlash("Tick completed. Outbound send/publish stays blocked in this phase.");
    } catch {
      setFlash("Tick failed. See server logs.");
    } finally {
      setBusy(false);
    }
  }

  async function act(collection: "content" | "chat" | "traffic", id: string, type: "dismiss" | "ready") {
    const res = await fetch("/api/ops/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ collection, id, type }),
    });
    const json = await res.json();
    if (json.state) setState(json.state);
  }

  async function tryOutbound(outbound: string) {
    const res = await fetch("/api/ops/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outbound }),
    });
    const json = await res.json();
    setFlash(json.message ?? "Refused.");
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {oauthError ? (
        <section className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
          <h2 className="font-semibold text-red-700 dark:text-red-300">{oauthError.title}</h2>
          <p className="mt-2 text-black/80 dark:text-white/80">{oauthError.hint}</p>
          <p className="mt-2 font-mono text-xs opacity-70">code: {oauthError.code}</p>
        </section>
      ) : null}

      <section className="rounded-lg border border-black/[.08] dark:border-white/[.145] p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-60">Current phase</p>
            <h2 className="text-xl font-semibold">
              Phase {status.phase.phase} — {status.phase.label}
            </h2>
            <p className="mt-1 text-sm opacity-80">
              {status.phase.subscriberCount} subscriber
              {status.phase.subscriberCount === 1 ? "" : "s"} ({status.phase.source})
            </p>
            <p className="mt-2 text-sm max-w-xl opacity-80">{status.phase.envelope}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {status.oauth.userLoggedIn ? (
              <form action="/api/oauth/logout" method="post">
                <button className="rounded-full bg-[#49f264] text-black px-4 h-10 text-sm cursor-pointer">
                  Logout
                </button>
              </form>
            ) : (
              <a
                href="/api/oauth/login"
                className="rounded-full bg-[#49f264] text-black px-4 h-10 text-sm flex items-center"
              >
                Login with Fanvue
              </a>
            )}
            <button
              onClick={tick}
              disabled={busy}
              className="rounded-full border border-black/15 dark:border-white/20 px-4 h-10 text-sm cursor-pointer disabled:opacity-50"
            >
              {busy ? "Running…" : "Run orchestrator tick"}
            </button>
          </div>
        </div>
        {flash ? <p className="mt-3 text-sm">{flash}</p> : null}
        {status.humanStepsRemaining.length ? (
          <ol className="mt-4 list-decimal list-inside text-sm space-y-1">
            {status.humanStepsRemaining.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm opacity-80">Fanvue session is active. Live writes stay phase-gated.</p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-black/[.08] dark:border-white/[.145] p-4">
          <h3 className="font-semibold">Setup status</h3>
          <p className="text-xs opacity-60 mt-1">Values are never shown — only whether a var is present.</p>
          <ul className="mt-3 text-sm space-y-1 font-mono">
            {envRows.map(([k, ok]) => (
              <li key={k} className="flex justify-between gap-3">
                <span>{k}</span>
                <span className={ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}>
                  {ok ? "present" : "missing"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            OAuth client: {status.oauth.clientConfigured ? "configured" : "missing"} · User login:{" "}
            {status.oauth.userLoggedIn ? "yes" : "still needed"}
          </p>
          <p className="mt-2 text-xs font-mono break-all opacity-70">
            Redirect URI: {status.oauth.redirectUri}
          </p>
        </div>
        <div className="rounded-lg border border-black/[.08] dark:border-white/[.145] p-4">
          <h3 className="font-semibold">24-hour rule</h3>
          <p className="mt-2 text-sm opacity-80">
            {status.cooldown.blocked
              ? `Outbound blocked until ${status.cooldown.retryAt}`
              : "No outbound campaign is in-flight. Drafts can still be generated."}
          </p>
          <p className="mt-2 text-xs opacity-60">
            Last outbound: {status.cooldown.lastOutboundKind ?? "none"}{" "}
            {status.cooldown.lastOutboundAt ? `at ${status.cooldown.lastOutboundAt}` : ""}
          </p>
          <p className="mt-3 text-xs opacity-60">Last tick: {status.lastTickAt ?? "never"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="text-xs rounded-full border px-3 py-1 cursor-pointer"
              onClick={() => tryOutbound("chatmate.mass_dm")}
            >
              Test: refuse mass DM
            </button>
            <button
              className="text-xs rounded-full border px-3 py-1 cursor-pointer"
              onClick={() => tryOutbound("content.publish")}
            >
              Test: refuse auto-publish
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-black/[.08] dark:border-white/[.145] p-4">
        <h3 className="font-semibold">Agents (implementation order)</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {status.automations.map((a) => (
            <div key={a.id} className="rounded-md border border-black/10 dark:border-white/10 p-3">
              <p className="text-xs uppercase opacity-60">{a.id}</p>
              <p className="font-medium">{a.enabled ? a.mode : "off"}</p>
              <p className="text-xs mt-1 opacity-70">{a.reason}</p>
              {report ? (
                <p className="text-xs mt-2">
                  {report.results.find((r) => r.agent === a.id)?.summary}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="ContentAgent — 7-day plan">
          {state.contentDrafts.map((d) => (
            <DraftRow
              key={d.id}
              title={`Day ${d.day}: ${d.title}`}
              body={`${d.placement} — ${d.caption}`}
              status={d.status}
              onReady={() => act("content", d.id, "ready")}
              onDismiss={() => act("content", d.id, "dismiss")}
            />
          ))}
        </Card>
        <Card title="ChatMate — draft replies">
          {state.chatDrafts.map((d) => (
            <DraftRow
              key={d.id}
              title={d.title}
              body={d.body}
              status={d.status}
              onReady={() => act("chat", d.id, "ready")}
              onDismiss={() => act("chat", d.id, "dismiss")}
            />
          ))}
        </Card>
        <Card title="MoneyBot — 3-item menu">
          {state.moneySuggestions.map((d) => (
            <div key={d.id} className="border-t border-black/10 dark:border-white/10 py-2 text-sm">
              <p className="font-medium">
                {d.name} · ${d.priceUsd}
              </p>
              <p className="opacity-70 text-xs mt-1">{d.note}</p>
            </div>
          ))}
        </Card>
        <Card title="TrafficAgent — Phase 1 checklist">
          {state.trafficReminders.map((d) => (
            <DraftRow
              key={d.id}
              title={d.title}
              body={d.detail}
              status={d.status}
              onReady={() => act("traffic", d.id, "ready")}
              onDismiss={() => act("traffic", d.id, "dismiss")}
            />
          ))}
        </Card>
      </section>

      <section className="rounded-lg border border-black/[.08] dark:border-white/[.145] p-4">
        <h3 className="font-semibold">AnalyticsAgent — local log</h3>
        {state.analyticsLog.length === 0 ? (
          <p className="text-sm mt-2 opacity-70">No snapshots yet. Run a tick.</p>
        ) : (
          <ul className="mt-2 text-xs font-mono space-y-1 max-h-48 overflow-auto">
            {[...state.analyticsLog].reverse().map((e) => (
              <li key={e.id}>
                {e.at} · phase {e.phase} · subs {e.subscriberCount} · {e.source}
                {e.skipped ? ` · ${e.skipped}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-black/[.08] dark:border-white/[.145] p-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function DraftRow({
  title,
  body,
  status,
  onReady,
  onDismiss,
}: {
  title: string;
  body: string;
  status: string;
  onReady: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="border-t border-black/10 dark:border-white/10 py-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs opacity-70 mt-1">{body}</p>
        </div>
        <span className="text-[10px] uppercase opacity-50 shrink-0">{status}</span>
      </div>
      {status === "draft" || status === "open" ? (
        <div className="mt-2 flex gap-2">
          <button className="text-xs rounded-full border px-2 py-0.5 cursor-pointer" onClick={onReady}>
            Mark ready
          </button>
          <button className="text-xs rounded-full border px-2 py-0.5 cursor-pointer" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
