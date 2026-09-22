/** Bean placement for the hero. d = depth: negative sits behind the cup,
 *  positive in front; |d| drives parallax, spread and blur. */
export type Bean = {
  src: string;
  layer: "back" | "front";
  d: number;
  rot: number;
  blur: number;
  // desktop: % of stage, size in vw
  xd: number; yd: number; sd: number;
  // phone
  xm: number; ym: number; sm: number;
};

const b = (i: number) => `/images/beans/bean-${i}.webp`;

export const BEANS: Bean[] = [
  { src: b(0), layer: "back", d: -0.5, rot: -20, blur: 1.4, xd: 31, yd: 27, sd: 3.8, xm: 18, ym: 54, sm: 8 },
  { src: b(3), layer: "back", d: -0.6, rot: 40, blur: 2, xd: 66, yd: 23, sd: 3.3, xm: 82, ym: 50, sm: 7 },
  { src: b(5), layer: "back", d: -0.4, rot: 110, blur: 1.1, xd: 37, yd: 76, sd: 3.2, xm: 26, ym: 90, sm: 7 },
  { src: b(8), layer: "back", d: -0.3, rot: -60, blur: 0.6, xd: 70, yd: 66, sd: 4.2, xm: 84, ym: 80, sm: 9 },
  { src: b(11), layer: "back", d: -0.75, rot: 15, blur: 2.4, xd: 55, yd: 13, sd: 2.6, xm: 60, ym: 45, sm: 6 },
  { src: b(1), layer: "front", d: 0.9, rot: -32, blur: 0, xd: 43.5, yd: 72, sd: 6.6, xm: 36, ym: 88, sm: 14 },
  { src: b(6), layer: "front", d: 0.7, rot: 52, blur: 0, xd: 58.6, yd: 40, sd: 4.6, xm: 67, ym: 64, sm: 10 },
  { src: b(9), layer: "front", d: 1.4, rot: 20, blur: 5, xd: 22, yd: 19, sd: 8.5, xm: 5, ym: 58, sm: 13 },
  { src: b(12), layer: "front", d: 1.7, rot: -40, blur: 7, xd: 63, yd: 99, sd: 10, xm: 94, ym: 98, sm: 20 },
  { src: b(14), layer: "front", d: 1.1, rot: 70, blur: 2.6, xd: 79, yd: 14, sd: 5.2, xm: 90, ym: 40, sm: 9 },
];

export const NOTES = [
  { src: b(2), name: "Panela", body: "Brown-sugar sweetness" },
  { src: b(7), name: "Red cherry", body: "A bright, clean middle" },
  { src: b(10), name: "Cacao nib", body: "A long, dark finish" },
];
