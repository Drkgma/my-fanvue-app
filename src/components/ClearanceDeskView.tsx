"use client";

import type { PolicyPack } from "@/lib/policy-pack";
import type { ClearanceResult, ReelDraft, Verdict } from "@/lib/clearance";

const VERDICT_STYLES: Record<Verdict, string> = {
  REMOVAL: "bg-red-500/15 text-red-300 border-red-500/40",
  DOWNRANK: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  CLEAR: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
};

type Tab = "desk" | "pack" | "categories" | "changelog";

export function ClearanceDeskView({
  pack,
  packJson,
  packError,
  missing,
  draft,
  result,
  tab,
  previousVersion,
  onTab,
  onDraft,
  onPackJson,
  onSave,
  onRestore,
}: {
  pack: PolicyPack;
  packJson: string;
  packError: string;
  missing: string[];
  draft: ReelDraft;
  result: ClearanceResult;
  tab: Tab;
  previousVersion: string | null;
  onTab: (tab: Tab) => void;
  onDraft: (draft: ReelDraft) => void;
  onPackJson: (value: string) => void;
  onSave: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#49f264]">Instagram Reels</p>
        <h1 className="mt-1 text-3xl font-semibold">Reel Clearance Desk</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Policy pack {pack.policy_version}. Every rule is tagged REMOVAL, DOWNRANK (recommendation-ineligible /
          age-gated), or CLEAR. Downrank is the tier that kills Explore and non-follower reach while leaving the post
          on the profile.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["desk", "Clear this Reel"],
            ["pack", "Policy pack"],
            ["categories", "Categories"],
            ["changelog", "Changes & open questions"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              tab === id ? "bg-white text-black" : "bg-white/10 text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "desk" ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <Field label="Outfit">
              <select
                className={selectClass}
                value={draft.outfit}
                onChange={(e) => onDraft({ ...draft, outfit: e.target.value as ReelDraft["outfit"] })}
              >
                <option value="street">Street / covered</option>
                <option value="athleisure">Athleisure / gym</option>
                <option value="swimwear">Swimwear / bikini</option>
                <option value="lingerie">Lingerie (not named in Meta docs)</option>
                <option value="see_through">See-through</option>
                <option value="partial_undress">Partial undress / near-nudity overlay</option>
              </select>
            </Field>
            <Field label="Framing">
              <select
                className={selectClass}
                value={draft.framing}
                onChange={(e) => onDraft({ ...draft, framing: e.target.value as ReelDraft["framing"] })}
              >
                <option value="face_or_full_scene">Face or full scene</option>
                <option value="full_body">Full body</option>
                <option value="chest_focus">Chest / breast as focus</option>
                <option value="buttocks_closeup">Buttocks close-up</option>
                <option value="crotch_focus">Crotch focus</option>
              </select>
            </Field>
            <Field label="Motion">
              <select
                className={selectClass}
                value={draft.motion}
                onChange={(e) => onDraft({ ...draft, motion: e.target.value as ReelDraft["motion"] })}
              >
                <option value="talking">Talking / vlog</option>
                <option value="walking">Walking</option>
                <option value="posing">Posing</option>
                <option value="dancing">Dancing</option>
                <option value="sexual_simulation">Simulating sexual activity</option>
              </select>
            </Field>
            <Field label={`Duration (seconds) — ${draft.durationSeconds}`}>
              <input
                type="range"
                min={3}
                max={240}
                value={draft.durationSeconds}
                onChange={(e) => onDraft({ ...draft, durationSeconds: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
            <Field label="Caption">
              <textarea
                className={`${selectClass} min-h-24`}
                value={draft.caption}
                onChange={(e) => onDraft({ ...draft, caption: e.target.value })}
                placeholder="Paste the caption and on-screen text"
              />
            </Field>
            <Field label="Audio">
              <select
                className={selectClass}
                value={draft.audio}
                onChange={(e) => onDraft({ ...draft, audio: e.target.value as ReelDraft["audio"] })}
              >
                <option value="sound_collection">Meta Sound Collection (commercial-cleared)</option>
                <option value="in_app_personal">In-app licensed library (personal use)</option>
                <option value="original">Original / owned audio</option>
                <option value="unknown_commercial">Chart track, commercial context unclear</option>
              </select>
            </Field>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <Toggle
                label="Public Creator/Business account"
                checked={draft.isPublicProfessional}
                onChange={(isPublicProfessional) => onDraft({ ...draft, isPublicProfessional })}
              />
              <Toggle
                label="AI-generated / synthetic persona"
                checked={draft.isAiGenerated}
                onChange={(isAiGenerated) => onDraft({ ...draft, isAiGenerated })}
              />
              <Toggle
                label="AI Info / disclosure applied"
                checked={draft.aiDisclosed}
                onChange={(aiDisclosed) => onDraft({ ...draft, aiDisclosed })}
              />
              <Toggle
                label="Visible watermark from another app"
                checked={draft.hasWatermark}
                onChange={(hasWatermark) => onDraft({ ...draft, hasWatermark })}
              />
              <Toggle
                label="Repost / not materially original"
                checked={draft.isRepost}
                onChange={(isRepost) => onDraft({ ...draft, isRepost })}
              />
              <Toggle
                label="Adult subscription link, username, or logo"
                checked={draft.hasOffPlatformAdultLink}
                onChange={(hasOffPlatformAdultLink) => onDraft({ ...draft, hasOffPlatformAdultLink })}
              />
              <Toggle
                label="Porn site URL / username"
                checked={draft.hasPornSiteLink}
                onChange={(hasPornSiteLink) => onDraft({ ...draft, hasPornSiteLink })}
              />
              <Toggle
                label="Paid / gifted branded content"
                checked={draft.isBranded}
                onChange={(isBranded) => onDraft({ ...draft, isBranded })}
              />
              <Toggle
                label="Paid partnership label applied"
                checked={draft.brandedLabeled}
                onChange={(brandedLabeled) => onDraft({ ...draft, brandedLabeled })}
              />
            </div>
          </form>

          <aside className="space-y-4">
            <div className={`rounded-2xl border p-5 ${VERDICT_STYLES[result.verdict]}`}>
              <p className="text-xs uppercase tracking-widest">{result.verdict}</p>
              <p className="mt-2 text-sm">{result.summary}</p>
            </div>
            {result.findings.length === 0 ? (
              <p className="text-sm text-zinc-400">No named signals fired. Recheck Account Status after publish.</p>
            ) : (
              <ul className="space-y-3">
                {result.findings.map((finding) => (
                  <li key={finding.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{finding.title}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${VERDICT_STYLES[finding.tier]}`}>
                        {finding.tier}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{finding.detail}</p>
                    <p className="mt-2 font-mono text-[11px] text-zinc-500">{finding.source_ids.join(" · ")}</p>
                  </li>
                ))}
              </ul>
            )}
            <details className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <summary className="cursor-pointer text-sm font-medium text-red-200">Hard stops (never post)</summary>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                {pack.hard_stops.map((stop) => (
                  <li key={stop.id}>
                    <span className="font-mono text-xs text-red-300">{stop.id}</span> {stop.rule}
                  </li>
                ))}
              </ul>
            </details>
          </aside>
        </div>
      ) : null}

      {tab === "pack" ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            Paste a monthly JSON pack here and save. The previous pack is kept for diffing. Current pack has{" "}
            {pack.sources.length} sources.
            {missing.length ? ` Missing required categories: ${missing.join(", ")}.` : ""}
          </p>
          <textarea
            className="min-h-[420px] w-full rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs"
            value={packJson}
            onChange={(e) => onPackJson(e.target.value)}
          />
          {packError ? <p className="text-sm text-red-400">{packError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-full bg-[#49f264] px-4 py-2 text-sm text-black" onClick={onSave}>
              Save pack
            </button>
            <button type="button" className="rounded-full bg-white/10 px-4 py-2 text-sm" onClick={onRestore}>
              Restore August 2026 default
            </button>
          </div>
          {previousVersion ? (
            <details className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <summary className="cursor-pointer font-medium">Previous saved pack</summary>
              <pre className="mt-3 max-h-80 overflow-auto text-xs text-zinc-400">{previousVersion}</pre>
            </details>
          ) : (
            <p className="text-xs text-zinc-500">No previous pack stored yet. Save twice to start a diff history.</p>
          )}
        </div>
      ) : null}

      {tab === "categories" ? (
        <div className="space-y-4">
          {pack.categories.map((category) => (
            <article key={category.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{category.name}</h2>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {category.id} · {category.confidence}
                </p>
              </div>
              <p className="mt-2 text-sm text-zinc-300">{category.what_the_policy_says}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <List title="Removal" items={category.removal_triggers} />
                <List title="Downrank" items={category.downrank_triggers} />
                <List title="Clearly allowed" items={category.clearly_allowed} />
                <List title="Grey zone" items={category.grey_zone} />
              </div>
              <p className="mt-3 font-mono text-[11px] text-zinc-500">{category.source_ids.join(" · ")}</p>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "changelog" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Changed in the last 12 months</h2>
            {pack.changed_recently.map((item) => (
              <article key={item.what} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <p className="text-xs text-zinc-500">{item.when}</p>
                <p className="mt-1 font-medium">{item.what}</p>
                <p className="mt-1 text-zinc-400">{item.impact}</p>
              </article>
            ))}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Open questions (next research pass)</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-300">
              {pack.open_questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
            <h2 className="pt-4 text-lg font-semibold">Enforcement observations</h2>
            {pack.enforcement_observations.map((item) => (
              <article key={item.claim} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <p>{item.claim}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
                  {item.confidence} · {item.source_ids.join(" · ")}
                </p>
                <p className="mt-1 text-zinc-400">{item.basis}</p>
              </article>
            ))}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-zinc-500">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-zinc-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const selectClass = "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100";
