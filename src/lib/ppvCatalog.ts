import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type PpvCatalogItem = {
  id: string;
  kind: string;
  label: string;
  price_cents: number;
  filename: string;
};

export type PpvScriptPack = {
  id: string;
  title: string;
  total: number;
  bundle_price_cents: number;
};

/** Read the starter PPV shot list. Counts and labels only — no media. */
export function readPpvCatalog(): PpvCatalogItem[] {
  const dest = join(process.cwd(), "fanvue-automation", "ppv_catalog.yaml");
  try {
    if (!existsSync(dest)) return [];
    const raw = readFileSync(dest, "utf8");
    const items: PpvCatalogItem[] = [];
    const blocks = raw.split(/\n  - id:/);
    for (const block of blocks.slice(1)) {
      const id = block.split("\n", 1)[0]?.trim();
      const kind = /kind:\s*(.+)/.exec(block)?.[1]?.trim() || "pic";
      const label = /label:\s*(.+)/.exec(block)?.[1]?.trim() || id || "";
      const price = Number(/price_cents:\s*(\d+)/.exec(block)?.[1] || 300);
      const filename = /filename:\s*(.+)/.exec(block)?.[1]?.trim() || id || "";
      if (!id) continue;
      items.push({ id, kind, label, price_cents: price, filename });
    }
    return items;
  } catch {
    return [];
  }
}

/** Film-it-yourself script packs. Shot counts only. */
export function readPpvScripts(): PpvScriptPack[] {
  const dest = join(process.cwd(), "fanvue-automation", "ppv_scripts.yaml");
  try {
    if (!existsSync(dest)) return [];
    const raw = readFileSync(dest, "utf8");
    const packs: PpvScriptPack[] = [];
    const blocks = raw.split(/\n  - id: /);
    for (const block of blocks.slice(1)) {
      const id = block.split("\n", 1)[0]?.trim();
      if (!id) continue;
      const title = /title:\s*(.+)/.exec(block)?.[1]?.trim() || id;
      const bundle = Number(/bundle_price_cents:\s*(\d+)/.exec(block)?.[1] || 300);
      const total = (block.match(/\{id:/g) || []).length;
      packs.push({ id, title, total, bundle_price_cents: bundle });
    }
    return packs;
  } catch {
    return [];
  }
}

export type PpvSellPack = {
  id: string;
  title: string;
  blurb: string;
  price_cents: number;
  prefix: string;
  min_pics: number;
  min_videos: number;
};

/** $9 / $23 / $35 / $75 wall packs. */
export function readPpvSellPacks(): PpvSellPack[] {
  const dest = join(process.cwd(), "fanvue-automation", "ppv_packs.yaml");
  try {
    if (!existsSync(dest)) return [];
    const raw = readFileSync(dest, "utf8");
    const packs: PpvSellPack[] = [];
    const blocks = raw.split(/\n  - id: /);
    for (const block of blocks.slice(1)) {
      const id = block.split("\n", 1)[0]?.trim();
      if (!id) continue;
      packs.push({
        id,
        title: /title:\s*(.+)/.exec(block)?.[1]?.trim() || id,
        blurb: /blurb:\s*(.+)/.exec(block)?.[1]?.trim() || "",
        price_cents: Number(/price_cents:\s*(\d+)/.exec(block)?.[1] || 300),
        prefix: /prefix:\s*(.+)/.exec(block)?.[1]?.trim() || id,
        min_pics: Number(/min_pics:\s*(\d+)/.exec(block)?.[1] || 1),
        min_videos: Number(/min_videos:\s*(\d+)/.exec(block)?.[1] || 0),
      });
    }
    return packs;
  } catch {
    return [];
  }
}
