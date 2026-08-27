import { existsSync, statSync } from "fs";
import { join } from "path";

/** True when ContentAgent can read tokens on THIS machine. Never reads the file. */
export function tokensFileExists(): boolean {
  const dest = join(process.cwd(), "fanvue-automation", "tokens.json");
  try {
    return existsSync(dest) && statSync(dest).size > 0;
  } catch {
    return false;
  }
}
