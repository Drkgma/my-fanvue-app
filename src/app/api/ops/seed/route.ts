import { NextResponse } from "next/server";
import { fanvueFetch, getAccessToken } from "@/lib/fanvue";
import { SOP_LISTS, SOP_VAULT_FOLDERS } from "@/lib/playbook";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await getAccessToken())) {
    return NextResponse.json({ error: "Not signed in to Fanvue" }, { status: 401 });
  }

  const createdLists: string[] = [];
  const skippedLists: string[] = [];
  const createdFolders: string[] = [];
  const skippedFolders: string[] = [];
  const failures: Array<{ name: string; detail: unknown }> = [];

  for (const list of SOP_LISTS) {
    const result = await fanvueFetch("/chats/lists/custom", {
      method: "POST",
      body: JSON.stringify({ name: list.name }),
    });
    if (result.ok || result.status === 409) {
      (result.status === 409 ? skippedLists : createdLists).push(list.name);
    } else {
      failures.push({ name: list.name, detail: result.data });
    }
  }

  for (const name of SOP_VAULT_FOLDERS) {
    const result = await fanvueFetch("/vault/folders", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (result.ok || result.status === 409) {
      (result.status === 409 ? skippedFolders : createdFolders).push(name);
    } else {
      failures.push({ name, detail: result.data });
    }
  }

  return NextResponse.json({
    createdLists,
    skippedLists,
    createdFolders,
    skippedFolders,
    failures,
  });
}
