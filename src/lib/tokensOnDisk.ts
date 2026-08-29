import { chmodSync, existsSync, mkdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";

const tokenDir = () => join(process.cwd(), "fanvue-automation");
const tokenPath = () => join(tokenDir(), "tokens.json");

/** True when ContentAgent can read tokens on THIS machine. Never reads the file. */
export function tokensFileExists(): boolean {
  const dest = tokenPath();
  try {
    return existsSync(dest) && statSync(dest).size > 0;
  } catch {
    return false;
  }
}

/** Write the signed-in session to fanvue-automation/tokens.json. Never logs values. */
export function persistSessionTokens(session: {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType?: string;
  scope?: string;
}): boolean {
  if (!session.accessToken) return false;
  mkdirSync(tokenDir(), { recursive: true });
  const dest = tokenPath();
  const body = JSON.stringify(
    {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      token_type: session.tokenType,
      scope: session.scope,
      expires_at: session.expiresAt,
    },
    null,
    2,
  );
  writeFileSync(dest, `${body}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(dest, 0o600);
  } catch {
    // best-effort
  }
  return tokensFileExists();
}
