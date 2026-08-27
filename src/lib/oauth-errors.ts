export type OauthErrorInfo = {
  code: string;
  title: string;
  hint: string;
  redirectUriUnregistered: boolean;
};

const REDIRECT_HINT =
  "Register this exact Redirect URI in the Fanvue Developer Area (https://fanvue.com/developers): http://localhost:3000/api/oauth/callback — then click Login with Fanvue again.";

export function explainOauthError(
  error?: string,
  description?: string,
): OauthErrorInfo | null {
  if (!error && !description) return null;
  const blob = `${error ?? ""} ${description ?? ""}`.toLowerCase();

  if (
    blob.includes("redirect_uri") ||
    blob.includes("redirect uri") ||
    blob.includes("invalid_redirect") ||
    blob.includes("mismatch") && blob.includes("redirect")
  ) {
    return {
      code: error || "redirect_uri",
      title: "Redirect URI is not registered on the Fanvue app",
      hint: REDIRECT_HINT,
      redirectUriUnregistered: true,
    };
  }

  if (blob.includes("access_denied")) {
    return {
      code: "access_denied",
      title: "Login was cancelled or denied",
      hint: "You can click Login with Fanvue again. If this keeps happening, check the app’s scopes match OAUTH_SCOPES (read:self).",
      redirectUriUnregistered: false,
    };
  }

  if (blob.includes("invalid_client") || blob.includes("unauthorized_client")) {
    return {
      code: "invalid_client",
      title: "OAuth client was rejected",
      hint: "Client ID/secret are configured locally. Confirm the Fanvue developer app is enabled and the secret still matches. Do not paste the secret into chat or git.",
      redirectUriUnregistered: false,
    };
  }

  if (blob.includes("oauth_state_mismatch")) {
    return {
      code: "oauth_state_mismatch",
      title: "Login session expired or state did not match",
      hint: "Click Login with Fanvue again from this same browser. Cookies must be allowed for localhost.",
      redirectUriUnregistered: false,
    };
  }

  if (blob.includes("oauth_token_exchange_failed") || blob.includes("invalid_grant")) {
    return {
      code: "oauth_token_exchange_failed",
      title: "Fanvue accepted the click but token exchange failed",
      hint: `${REDIRECT_HINT} Also confirm the Client ID/secret still match the developer app.`,
      redirectUriUnregistered: true,
    };
  }

  return {
    code: error || "oauth_error",
    title: "Fanvue login did not complete",
    hint: description || REDIRECT_HINT,
    redirectUriUnregistered: blob.includes("invalid_request"),
  };
}

export function sanitizeTokenError(text: string): string {
  return text
    .replace(/client_secret=[^&\s]+/gi, "client_secret=redacted")
    .replace(/Bearer\s+\S+/gi, "Bearer redacted")
    .slice(0, 300);
}
