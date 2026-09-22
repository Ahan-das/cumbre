/** The cold bar. Cacao leads: its latte tan continues the hero's peach.
 * Colours are per flavour: bg (stage), soft (disc), deep (word + button), ink (text). */
export type Flavour = {
  id: string;
  word: string;      // the giant word
  name: string;      // full menu name
  line: string;      // one-line description
  price: string;
  img: string;
  w: number;         // image aspect (w / h)
  bg: string;
  soft: string;
  deep: string;
  ink: string;
};

export const FLAVOURS: Flavour[] = [
  {
    id: "cacao",
    word: "Cacao",
    name: "Chocolate Frappé",
    line: "Dark cacao, cold brew and ice blended thick, with whipped cream and a slow cocoa drizzle.",
    price: "₹270",
    img: "/images/drinks/chocolate.webp",
    w: 546 / 963,
    bg: "#e9cdb6",
    soft: "#f6e7da",
    deep: "#7a3f22",
    ink: "#3b1a12"
  },
  {
    id: "strawberry",
    word: "Strawberry",
    name: "Strawberry Cloud",
    line: "Crushed strawberries shaken into cold milk, a tall swirl of cream, and a shot of espresso if you want one.",
    price: "₹240",
    img: "/images/drinks/strawberry.webp",
    w: 539 / 1100,
    bg: "#f7cfd4",
    soft: "#fde8ea",
    deep: "#c2263d",
    ink: "#4f0f1c"
  },
  {
    id: "mango",
    word: "Mango",
    name: "Vanilla Mango",
    line: "Alphonso mango layered over vanilla cream and a cold-brew base. Tastes like the first week of May.",
    price: "₹260",
    img: "/images/drinks/vanilla.webp",
    w: 276 / 530,
    bg: "#fbe2a0",
    soft: "#fff3cf",
    deep: "#d97a06",
    ink: "#4d2c04"
  },
  {
    id: "matcha",
    word: "Matcha",
    name: "Matcha Machito",
    line: "Ceremonial-grade matcha whisked over ice and oat milk, finished with a matcha-dusted crown.",
    price: "₹280",
    img: "/images/drinks/matcha.webp",
    w: 552 / 962,
    bg: "#d9e8c2",
    soft: "#eef5e2",
    deep: "#4c8a28",
    ink: "#1d3a10"
  },
];
