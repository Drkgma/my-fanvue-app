import { NextResponse } from "next/server";
import { asArray, asRecord, fanvueFetch, getAccessToken } from "@/lib/fanvue";
import { SOP_LISTS, spendBucket } from "@/lib/playbook";

export const dynamic = "force-dynamic";

const REQUIRED_KEYS = ["new", "builders", "whales", "inner"] as const;

export async function POST() {
  if (!(await getAccessToken())) {
    return NextResponse.json({ error: "Not signed in to Fanvue" }, { status: 401 });
  }

  const listsRes = await fanvueFetch("/chats/lists/custom?page=1&size=50");
  const spendersRes = await fanvueFetch("/insights/top-spenders?page=1&size=15");
  if (!listsRes.ok) {
    return NextResponse.json({ error: "Could not load custom lists", detail: listsRes.data }, { status: listsRes.status });
  }
  if (!spendersRes.ok) {
    return NextResponse.json(
      { error: "Could not load top spenders", detail: spendersRes.data },
      { status: spendersRes.status },
    );
  }

  const lists = asArray(listsRes.data);
  const spenders = asArray(spendersRes.data);
  const listByKey = new Map(SOP_LISTS.map((item) => [item.key, lists.find((list) => list.name === item.name)]));

  const missing = REQUIRED_KEYS.filter((key) => typeof listByKey.get(key)?.uuid !== "string").map(
    (key) => SOP_LISTS.find((item) => item.key === key)?.name ?? key,
  );
  if (missing.length) {
    return NextResponse.json(
      { error: "Seed SOP lists first (Seed lists + vault), then siphon.", missing },
      { status: 409 },
    );
  }

  const batches = new Map<string, { name: string; uuids: string[] }>();
  const considered: Array<{ handle: string; bucket: string; gross: number }> = [];

  for (const spender of spenders.slice(0, 10)) {
    const user = asRecord(spender.user) ?? {};
    const uuid = typeof user.uuid === "string" ? user.uuid : "";
    if (!uuid) continue;
    const gross = Number(spender.gross ?? 0);
    const bucket = spendBucket(gross);
    considered.push({
      handle: String(user.handle ?? uuid),
      bucket,
      gross,
    });

    for (const key of [bucket, "inner"] as const) {
      const list = listByKey.get(key);
      const listUuid = typeof list?.uuid === "string" ? list.uuid : "";
      if (!listUuid) continue;
      const existing = batches.get(listUuid) ?? { name: String(list?.name ?? key), uuids: [] };
      if (!existing.uuids.includes(uuid)) existing.uuids.push(uuid);
      batches.set(listUuid, existing);
    }
  }

  const placements: Array<{ list: string; added: number; skipped: number; members: number; error?: unknown }> = [];

  for (const [listUuid, batch] of batches) {
    const result = await fanvueFetch(`/chats/lists/custom/${listUuid}/members`, {
      method: "POST",
      body: JSON.stringify({ userUuids: batch.uuids }),
    });
    const body = asRecord(result.data) ?? {};
    placements.push({
      list: batch.name,
      added: result.ok ? Number(body.added ?? 0) : 0,
      skipped: result.ok ? Number(body.skipped ?? 0) : 0,
      members: batch.uuids.length,
      error: result.ok ? undefined : result.data,
    });
  }

  return NextResponse.json({
    spendersConsidered: considered,
    placements,
  });
}
