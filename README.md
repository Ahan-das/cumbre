# Cumbre · Small-batch coffee

Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Framer Motion, with a hand-written WebGL2/GLSL renderer for the Blender cup.

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build status

- [x] Hero
- [x] Midsection: flavour wheel (strawberry, mango, matcha, cacao)
- [x] Pages: `/`, `/coffee`, `/ice-cream`, `/pastries`, `/order`
- [x] Header Menu button: search every item, jump to its page (`/coffee?item=matcha`)
- [x] Visit + footer
- [x] Bag and order page (`lib/cartStore.ts` + `/order`): add, change quantity, place an order. Saved in localStorage; there is no payment step — you pay at the counter.
- [ ] Real payments, if you ever want them (needs a backend + a gateway like Razorpay)

## Hero: which tool does what

| Piece | Tool | Why |
|---|---|---|
| Cup (`public/models/cup.glb`, your Blender export) | Raw WebGL2 + GLSL (`src/lib/webgl`) | One object, 7 meshes, no compression. A ~7 kB renderer beats shipping three.js (~150 kB gz) for this. The shader has studio 3-light GGX lighting, kraft-paper grain, and the label **projected onto the cylinder**. In the .blend the label is a flat plane floating in front of the sleeve, which shows from the side. |
| Steam | GLSL fbm shader on a camera-facing quad | Soft, living volume with no textures or particles. |
| Parallax, scroll hand-off, bean physics | One `requestAnimationFrame` loop (`heroEngine.ts`) writing transforms | ~20 elements update every frame. Direct writes are cheaper than many motion values, and the loop pauses when the hero is offscreen. |
| Bean repel (signature move) | Spring integrator in the same loop | Beans move out of the cursor's way and wobble back. |
| Intro (letters rise, copy reveals) | CSS keyframes + native CSS `linear()` spring | Runs before hydration, so there's no flash. |
| Button press | Framer Motion `whileTap` spring | Declarative gesture physics is where Framer is strongest. The midsection's flavour swaps will use `AnimatePresence`. |
| Layout and tokens | `src/styles/tokens.css` → exposed to Tailwind through `@theme inline` | The hero is art-directed, so it uses hand-written CSS (`hero.css`). Simpler sections use Tailwind utilities with the same tokens. |

Also handled:

- `prefers-reduced-motion`: the page renders static. No idle motion, no scroll choreography, no intro.
- No WebGL2: falls back to `public/images/cup-poster.webp` (a render of the same cup).
- Phones: separate layout, with copy on top, the cup low, and its own bean positions. Bean repel only runs on fine pointers (mouse/trackpad).

## Midsection: which tool does what

| Piece | Tool | Why |
|---|---|---|
| Wheel rotation, holds, drink lean/tilt | One rAF loop (`midEngine.ts`) | Scroll-scrubbed and continuous. Each flavour rests for half its scroll span, then rolls on. |
| Colours that follow the drink | Engine blends ground, glow, word, text, button and ring in **OKLab** and writes them to CSS variables (`--m-*`) | Blending in OKLab keeps in-between colours vivid instead of greying out. Every style reads these variables. |
| Giant word and copy swap | Framer Motion `AnimatePresence` (per-letter stagger, blur cross-fade) | Keyed enter/exit is what Framer does best. |
| Active flavour card | Framer Motion `layoutId` spring | The highlight glides between cards. |
| Card click | `goTo(i)` scrolls to that flavour's resting point | You can jump straight to a flavour instead of scrolling. |
| Hero hand-off | The section slides up over the hero as a rounded sheet (`margin-top` + `overflow: clip`) | Pure CSS. |

## Menu chapters

| Chapter | Scroll behaviour | Background world |
|---|---|---|
| Coffee (`components/mid`) | Arc wheel: drinks roll up from the right | Three circles: pale disc, solid orb, dotted ring |
| Ice cream (`components/menu/ScoopChapter.tsx`) | The scoop you pass climbs into a stack at the top, so the pile grows | Melting lip across the top edge, drifting pastel blobs, sprinkles |
| Pastries (`components/menu/ShelfChapter.tsx`) | Bakery case moving vertically, one shelf at a time | Arched windows on a shelf plank, faint gingham, a sheen crossing the glass |

All three share `lib/scrollSnap.ts` (one gesture = one item, swipe on touch) and `lib/palette.ts` (OKLab colour blending), so they feel like one site.

## Assets

- `public/images/beans/*`: your bean PNGs.
- `public/models/cup.glb`: your Blender cup.
- `public/images/drinks/*`: your drink images, cut out from the checkerboard baked into the originals (flood fill + GrabCut).
- Fonts (self-hosted, SIL Open Font License): Big Shoulders, Instrument Sans, Instrument Serif.
