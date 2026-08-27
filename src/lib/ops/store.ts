import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { EMPTY_STATE, type OpsState } from "./types";

const DEFAULT_DIR = path.join(process.cwd(), ".data");
const FILE = "ops-state.json";

let chain: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function filePath() {
  const dir = process.env.OPS_DATA_DIR?.trim() || DEFAULT_DIR;
  return path.join(dir, FILE);
}

function isOpsState(value: unknown): value is OpsState {
  if (!value || typeof value !== "object") return false;
  const v = value as OpsState;
  return v.version === 1 && Array.isArray(v.contentDrafts) && Array.isArray(v.analyticsLog);
}

export async function loadState(): Promise<OpsState> {
  return serialize(async () => {
    try {
      const raw = await readFile(filePath(), "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!isOpsState(parsed)) return { ...EMPTY_STATE };
      return {
        ...EMPTY_STATE,
        ...parsed,
        agentCooldowns: parsed.agentCooldowns ?? {},
        contentDrafts: parsed.contentDrafts ?? [],
        chatDrafts: parsed.chatDrafts ?? [],
        moneySuggestions: parsed.moneySuggestions ?? [],
        trafficReminders: parsed.trafficReminders ?? [],
        analyticsLog: parsed.analyticsLog ?? [],
        refused: parsed.refused ?? [],
        todayPlan: parsed.todayPlan ?? null,
      };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return { ...EMPTY_STATE };
      throw err;
    }
  });
}

export async function saveState(state: OpsState): Promise<void> {
  await serialize(async () => {
    const dir = path.dirname(filePath());
    await mkdir(dir, { recursive: true });
    const tmp = `${filePath()}.tmp`;
    await writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
    await writeFile(filePath(), JSON.stringify(state, null, 2), "utf8");
  });
}

export async function updateState(mutator: (state: OpsState) => OpsState | Promise<OpsState>) {
  const current = await loadState();
  const next = await mutator(current);
  await saveState(next);
  return next;
}
