import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type PpvCatalogItem = {
  id: string;
  kind: string;
  label: string;
  price_cents: number;
  filename: string;
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
