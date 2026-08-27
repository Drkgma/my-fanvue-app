import assert from "node:assert/strict";
import { test } from "node:test";
import { explainOauthError } from "../oauth-errors.ts";

test("unregistered redirect URI gets a clear hint", () => {
  const info = explainOauthError("invalid_request", "redirect_uri mismatch");
  assert.ok(info);
  assert.equal(info.redirectUriUnregistered, true);
  assert.match(info.hint, /fanvue.com\/developers/);
  assert.match(info.hint, /localhost:3000\/api\/oauth\/callback/);
});
