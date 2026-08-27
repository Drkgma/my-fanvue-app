import { NextResponse } from "next/server";
import { asArray, asRecord, fanvueFetch, getAccessToken } from "@/lib/fanvue";
import { env } from "@/env";
import { SOP_LISTS, SOP_VAULT_FOLDERS } from "@/lib/playbook";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(env.OAUTH_CLIENT_ID && env.OAUTH_CLIENT_SECRET && env.OAUTH_REDIRECT_URI);
  let token: string | null = null;
  try {
    token = configured ? await getAccessToken() : null;
  } catch {
    token = null;
  }

  if (!configured || !token) {
    return NextResponse.json({
      configured,
      signedIn: Boolean(token),
      blockers: [
        !configured
          ? "Create a Fanvue app at https://fanvue.com/developers/apps and set OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI as secrets."
          : null,
        configured && !token ? "Click Login with Fanvue, then come back to Operate." : null,
        "Cloud agents cannot complete Fanvue MCP OAuth. In Cursor Desktop: Settings → Tools & MCP → Fanvue → Sign in, then send “operate this” again.",
      ].filter(Boolean),
    });
  }

  const [account, unread, lists, vault, spenders, promotions, trials, chats] = await Promise.all([
    fanvueFetch("/users/account"),
    fanvueFetch("/chats/unread"),
    fanvueFetch("/chats/lists/custom?page=1&size=50"),
    fanvueFetch("/vault/folders?page=1&size=50"),
    fanvueFetch("/insights/top-spenders?page=1&size=15"),
    fanvueFetch("/promotions"),
    fanvueFetch("/free-trial-links"),
    fanvueFetch("/chats?page=1&size=10&filter=unread"),
  ]);

  const listData = asArray(lists.data);
  const vaultData = asArray(vault.data);
  const existingLists = new Set(listData.map((item) => String(item.name ?? "")));
  const existingFolders = new Set(vaultData.map((item) => String(item.name ?? "")));
  const unreadCounts = asRecord(unread.ok ? unread.data : null);

  return NextResponse.json({
    configured: true,
    signedIn: true,
    blockers: [],
    account: account.ok ? account.data : { error: account.data },
    unread: unread.ok ? unread.data : { error: unread.data },
    lists: listData,
    vault: vaultData,
    spenders: asArray(spenders.data),
    promotions: asArray(promotions.data),
    freeTrialLinks: asArray(trials.data),
    inbox: asArray(chats.data).map((chat) => {
      const user = asRecord(chat.user) ?? {};
      const lastMessage = asRecord(chat.lastMessage);
      return {
        uuid: user.uuid,
        handle: user.handle,
        displayName: user.displayName,
        unreadMessagesCount: chat.unreadMessagesCount,
        isRead: chat.isRead,
        lastText: lastMessage?.text ?? null,
      };
    }),
    missingLists: SOP_LISTS.filter((item) => !existingLists.has(item.name)).map((item) => item.name),
    missingFolders: SOP_VAULT_FOLDERS.filter((name) => !existingFolders.has(name)),
    hasFourteenDayTrial: asArray(promotions.data).some(
      (promo) => promo.type === "free_trial" && promo.freeTrialDays === 14 && promo.availableToGroup === "new_subscribers",
    ),
    unreadChatsCount: unreadCounts?.unreadChatsCount ?? null,
    errors: {
      account: account.ok ? null : account.data,
      unread: unread.ok ? null : unread.data,
      lists: lists.ok ? null : lists.data,
      vault: vault.ok ? null : vault.data,
      spenders: spenders.ok ? null : spenders.data,
      chats: chats.ok ? null : chats.data,
    },
  });
}
