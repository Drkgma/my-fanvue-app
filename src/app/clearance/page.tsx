"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import defaultPack from "@/data/policy-pack.json";
import {
  isPolicyPack,
  missingRequiredCategories,
  type PolicyPack,
} from "@/lib/policy-pack";
import { emptyDraft, evaluateReel, type ReelDraft } from "@/lib/clearance";
import { ClearanceDeskView } from "@/components/ClearanceDeskView";

const PACK_KEY = "reel-clearance-policy-pack";
const PREV_KEY = "reel-clearance-policy-pack-previous";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getPackSnapshot() {
  return localStorage.getItem(PACK_KEY);
}

function parsePack(raw: string | null): PolicyPack {
  if (!raw) return defaultPack as PolicyPack;
  try {
    const parsed = JSON.parse(raw);
    return isPolicyPack(parsed) ? parsed : (defaultPack as PolicyPack);
  } catch {
    return defaultPack as PolicyPack;
  }
}

export default function ClearanceDeskPage() {
  const storedJson = useSyncExternalStore(subscribe, getPackSnapshot, () => null);
  const [localPack, setLocalPack] = useState<PolicyPack | null>(null);
  const [localJson, setLocalJson] = useState<string | null>(null);
  const [packError, setPackError] = useState("");
  const [draft, setDraft] = useState<ReelDraft>(emptyDraft);
  const [tab, setTab] = useState<"desk" | "pack" | "categories" | "changelog">("desk");
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);

  const pack = localPack ?? parsePack(storedJson);
  const packJson = localJson ?? JSON.stringify(pack, null, 2);
  const result = useMemo(() => evaluateReel(draft, pack), [draft, pack]);
  const missing = missingRequiredCategories(pack);

  const savePack = () => {
    try {
      const parsed = JSON.parse(packJson);
      if (!isPolicyPack(parsed)) {
        setPackError("JSON parsed but is missing required policy-pack fields.");
        return;
      }
      const gaps = missingRequiredCategories(parsed);
      if (gaps.length) {
        setPackError(`Pack is missing required category IDs: ${gaps.join(", ")}`);
        return;
      }
      const previous = localStorage.getItem(PACK_KEY);
      if (previous) localStorage.setItem(PREV_KEY, previous);
      localStorage.setItem(PACK_KEY, JSON.stringify(parsed));
      setLocalPack(parsed);
      setLocalJson(JSON.stringify(parsed, null, 2));
      setPreviousVersion(localStorage.getItem(PREV_KEY));
      setPackError("");
    } catch (error) {
      setPackError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };

  const restoreDefault = () => {
    const next = defaultPack as PolicyPack;
    localStorage.setItem(PACK_KEY, JSON.stringify(next));
    setLocalPack(next);
    setLocalJson(JSON.stringify(next, null, 2));
    setPackError("");
  };

  return (
    <ClearanceDeskView
      pack={pack}
      packJson={packJson}
      packError={packError}
      missing={missing}
      draft={draft}
      result={result}
      tab={tab}
      previousVersion={previousVersion}
      onTab={setTab}
      onDraft={setDraft}
      onPackJson={(value) => {
        setLocalJson(value);
      }}
      onSave={savePack}
      onRestore={restoreDefault}
    />
  );
}
