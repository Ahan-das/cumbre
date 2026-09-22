"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { SCOOPS } from "./items";
import { startScoops } from "./scoopEngine";
import { ChapterCopy, ChapterPicks, ChapterWord } from "./ChapterParts";
import { registerChapter } from "@/lib/menuRegistry";
import "./menu.css";

/** Soft blobs and sprinkles: fixed positions, the engine only moves them. */
const BLOBS = [
  { x: 18, y: 26, w: 26, r: "62% 38% 44% 56% / 52% 44% 56% 48%", tint: 16, blur: 0 },
  { x: 82, y: 22, w: 18, r: "48% 52% 60% 40% / 58% 38% 62% 42%", tint: 22, blur: 2 },
  { x: 74, y: 78, w: 30, r: "56% 44% 38% 62% / 44% 58% 42% 56%", tint: 12, blur: 4 },
  { x: 30, y: 86, w: 14, r: "50% 50% 44% 56% / 60% 40% 60% 40%", tint: 26, blur: 0 },
];
const SPRINKLES = [
  { x: 24, y: 18, w: 42 }, { x: 62, y: 14, w: 30 }, { x: 88, y: 44, w: 36 },
  { x: 12, y: 58, w: 28 }, { x: 44, y: 90, w: 38 }, { x: 70, y: 32, w: 24 },
  { x: 92, y: 68, w: 32 }, { x: 34, y: 44, w: 22 },
];

export default function ScoopChapter() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drip = useRef<HTMLDivElement>(null);
  const blobs = useRef<(HTMLDivElement | null)[]>([]);
  const sprinkles = useRef<(HTMLDivElement | null)[]>([]);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const handle = useRef<{ goTo: (i: number, d?: number) => void } | null>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const wanted = useSearchParams().get("item");
  const landed = useRef(false);
  const item = SCOOPS[active];

  useEffect(() => {
    if (!root.current || !stage.current || !drip.current || SCOOPS.length === 0) return;
    const keep = <T,>(a: (T | null)[]) => a.filter((el): el is T => !!el);
    const h = startScoops(
      {
        root: root.current,
        stage: stage.current,
        drip: drip.current,
        blobs: keep(blobs.current),
        sprinkles: keep(sprinkles.current),
        items: keep(items.current),
      },
      { palettes: SCOOPS, reduced: !!reduced, onIndex: setActive },
    );
    handle.current = h;
    const unregister = registerChapter("ice-cream", h.goTo);
    return () => {
      unregister();
      h.destroy();
    };
  }, [reduced]);

  // the menu sends ?item=<id>: open on it (instantly the first time, animated after)
  useEffect(() => {
    if (!wanted) return;
    const i = SCOOPS.findIndex((x) => x.id === wanted);
    if (i < 0) return;
    const first = !landed.current;
    landed.current = true;
    const t = window.setTimeout(() => handle.current?.goTo(i, first ? 0 : 900), first ? 60 : 0);
    return () => window.clearTimeout(t);
  }, [wanted]);

  if (SCOOPS.length === 0) return null;

  return (
    <section
      ref={root}
      id="ice-cream"
      className="chapter scoops"
      style={{ height: `${SCOOPS.length * 95 + 15}svh` }}
      aria-labelledby="scoops-title"
    >
      <div ref={stage} className="chapter__stage">
        {BLOBS.map((b, i) => (
          <div
            key={i}
            ref={(el) => { blobs.current[i] = el; }}
            className="scoops__blob"
            aria-hidden="true"
            style={{
              ["--x" as string]: `${b.x}%`, ["--y" as string]: `${b.y}%`, ["--w" as string]: `${b.w}vw`,
              ["--r" as string]: b.r, ["--tint" as string]: `${b.tint}%`, ["--blur" as string]: `${b.blur}px`,
            }}
          />
        ))}

        <div ref={drip} className="scoops__drip" aria-hidden="true">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            {/* a soft-serve lip: flat top, uneven drips hanging off it */}
            <path d="M0 0h1200v42c-38 0-42 34-70 34s-30-26-62-26-34 46-66 46-32-52-64-52-36 30-68 30-30-40-62-40-38 52-70 52-30-46-62-46-36 28-68 28-32-40-64-40-34 44-66 44-34-52-66-52-32 30-64 30-36-24-68-24-32 22-60 22V0z" />
          </svg>
        </div>

        {SPRINKLES.map((s, i) => (
          <div
            key={i}
            ref={(el) => { sprinkles.current[i] = el; }}
            className="scoops__sprinkle"
            aria-hidden="true"
            style={{ ["--x" as string]: `${s.x}%`, ["--y" as string]: `${s.y}%`, ["--w" as string]: `${s.w}px` }}
          />
        ))}

        <div className="scoops__floor" aria-hidden="true" />

        <ChapterWord item={item} />

        <div className="chapter__items">
          {SCOOPS.map((it, n) => (
            <div
              key={it.id}
              ref={(el) => { items.current[n] = el; }}
              className="chapter__item"
              style={{ ["--ar" as string]: it.w }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- transformed every frame */}
              <img src={it.img} alt={it.name} draggable={false} decoding="async" loading={n === 0 ? "eager" : "lazy"} />
            </div>
          ))}
        </div>

        <ChapterCopy item={item} kicker="The scoop counter" cta="Add a scoop" titleId="scoops-title" />
        <ChapterPicks
          items={SCOOPS}
          active={active}
          onPick={(i) => handle.current?.goTo(i)}
          label="Choose a scoop"
          layoutId="scoop-pick-active"
        />
      </div>
    </section>
  );
}
