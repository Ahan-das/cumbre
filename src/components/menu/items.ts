/**
 * Menu chapters beyond the cold bar.
 * Images live in public/images/scoops and public/images/pastries.
 */
import type { Palette } from "@/lib/palette";

export type MenuItem = Palette & {
  id: string;
  word: string;   // the giant word
  name: string;
  line: string;
  price: string;
  img: string;
  w: number;      // image aspect (w / h)
};

export const SCOOPS: MenuItem[] = [
  {
    id: "strawberry-scoop",
    word: "Strawberry",
    name: "Strawberry Swirl",
    line: "Whole strawberries folded through sweet cream the same morning they arrive.",
    price: "₹160",
    img: "/images/scoops/strawberry.webp",
    w: 222 / 365,
    bg: "#fbdfe3", soft: "#fff1f2", deep: "#c83a52", ink: "#4d1420",
  },
  {
    id: "pistachio",
    word: "Pistachio",
    name: "Salted Pistachio",
    line: "Slow-roasted pistachios, ground fine, with just enough sea salt to keep it awake.",
    price: "₹180",
    img: "/images/scoops/pistachio.webp",
    w: 725 / 1200,
    bg: "#e3edcf", soft: "#f4f8ea", deep: "#5c8a33", ink: "#263c14",
  },
  {
    id: "belgian",
    word: "Chocolate",
    name: "Belgian Chocolate",
    line: "Dark couverture melted into custard. Dense enough to hold a spoon upright.",
    price: "₹170",
    img: "/images/scoops/chocolate.webp",
    w: 1219 / 1200,
    bg: "#e7cfbc", soft: "#f8ece1", deep: "#6b3a22", ink: "#341709",
  },
  {
    id: "mango-scoop",
    word: "Mango",
    name: "Alphonso Mango Sundae",
    line: "Pulped Alphonso layered with cream and crumble in a tall glass. Only while the season lasts.",
    price: "₹170",
    img: "/images/scoops/mango.webp",
    w: 255 / 430,
    bg: "#fbe6b4", soft: "#fff6dd", deep: "#db8908", ink: "#4a2d03",
  },
];

export const PASTRIES: MenuItem[] = [
  {
    id: "croissant",
    word: "Croissant",
    name: "Chocolate-Drizzled Croissant",
    line: "Laminated over three days with cultured butter, then striped with dark chocolate.",
    price: "₹140",
    img: "/images/pastries/croissant.webp",
    w: 614 / 389,
    bg: "#f2e2c8", soft: "#fdf4e4", deep: "#a4691f", ink: "#42280a",
  },
  {
    id: "cruffin",
    word: "Cruffin",
    name: "Raisin Cruffin",
    line: "Croissant dough rolled into a muffin tin, packed with rum raisins and rolled in sugar.",
    price: "₹150",
    img: "/images/pastries/cruffin.webp",
    w: 291 / 306,
    bg: "#eed9c2", soft: "#fbeedf", deep: "#95562a", ink: "#3d1f0c",
  },
  {
    id: "cheesecake",
    word: "Cheesecake",
    name: "Berry Cheesecake",
    line: "Baked slow on a cocoa-biscuit base, under berry compote and whatever fruit the market had.",
    price: "₹220",
    img: "/images/pastries/cheesecake.webp",
    w: 1076 / 1200,
    bg: "#f4dcda", soft: "#fdeeec", deep: "#a52b47", ink: "#41101c",
  },
];
