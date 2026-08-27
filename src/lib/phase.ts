import { readFileSync } from "fs";
import { join } from "path";

/** Read `phase` from config.yaml. Missing file → Phase 0. */
export function readCurrentPhase(): number {
  try {
    const raw = readFileSync(join(process.cwd(), "config.yaml"), "utf8");
    const match = raw.match(/^phase:\s*(\d+)/m);
    if (!match) return 0;
    return Number(match[1]);
  } catch {
    return 0;
  }
}

export function readSubscriberTarget(): number {
  try {
    const raw = readFileSync(join(process.cwd(), "config.yaml"), "utf8");
    const match = raw.match(/^subscriber_target:\s*(\d+)/m);
    if (!match) return 10;
    return Number(match[1]);
  } catch {
    return 10;
  }
}
