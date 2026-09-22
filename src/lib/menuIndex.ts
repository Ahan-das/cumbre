import { FLAVOURS } from "@/components/mid/flavours";
import { PASTRIES, SCOOPS } from "@/components/menu/items";
import type { ChapterId } from "./menuRegistry";

export type MenuEntry = {
  id: string;
  /** the id used in the ?item= query on its page */
  slug: string;
  /** the page this item lives on */
  href: string;
  name: string;
  price: string;
  img: string;
  group: string;
  chapter: ChapterId;
  index: number;
  /** extra words that should match a search ("iced", "cold", "cake"...) */
  tags: string;
};

const PAGE: Record<ChapterId, string> = {
  coffee: "/coffee",
  "ice-cream": "/ice-cream",
  pastries: "/pastries",
};

const from = (arr: typeof FLAVOURS, chapter: ChapterId, group: string, tags: string): MenuEntry[] =>
  arr.map((it, index) => ({
    id: `${chapter}-${it.id}`,
    slug: it.id,
    href: `${PAGE[chapter]}?item=${it.id}`,
    name: it.name,
    price: it.price,
    img: it.img,
    group,
    chapter,
    index,
    tags: `${it.word} ${it.line} ${tags}`.toLowerCase(),
  }));

export const MENU: MenuEntry[] = [
  ...from(FLAVOURS, "coffee", "Coffee", "coffee iced cold drink shake cold bar"),
  ...from(SCOOPS, "ice-cream", "Ice cream", "scoop cone gelato dessert"),
  ...from(PASTRIES, "pastries", "Pastries", "bake baked cake bun sweet"),
];

/** Rank matches: name start, then name contains, then anything in the tags. */
export function searchMenu(query: string): MenuEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return MENU;
  const score = (e: MenuEntry) => {
    const n = e.name.toLowerCase();
    if (n.startsWith(q)) return 0;
    if (n.includes(q)) return 1;
    if (e.group.toLowerCase().includes(q)) return 2;
    if (e.tags.includes(q)) return 3;
    return 99;
  };
  const hits = MENU.map((e, i) => ({ e, i, s: score(e) })).filter((r) => r.s < 99);
  // keep each group together (one heading), best-matching group first
  const best = new Map<string, number>();
  for (const h of hits) best.set(h.e.group, Math.min(best.get(h.e.group) ?? 99, h.s));
  return hits
    .sort((a, b) => best.get(a.e.group)! - best.get(b.e.group)! || a.s - b.s || a.i - b.i)
    .map((r) => r.e);
}
