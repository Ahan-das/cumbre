"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { PASTRIES } from "./items";
import { startShelf } from "./shelfEngine";
import { ChapterCopy, ChapterPicks, ChapterWord } from "./ChapterParts";
import { registerChapter } from "@/lib/menuRegistry";
import "./menu.css";

const CRUMBS = [
  { x: 16, y: 72, w: 10 }, { x: 22, y: 80, w: 6 }, { x: 34, y: 66, w: 8 },
  { x: 58, y: 88, w: 7 }, { x: 88, y: 84, w: 9 }, { x: 46, y: 30, w: 6 },
  { x: 92, y: 26, w: 8 },
];

export default function ShelfChapter() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const case_ = useRef<HTMLDivElement>(null);
  const sheen = useRef<HTMLDivElement>(null);
  const crumbs = useRef<(HTMLDivElement | null)[]>([]);
  const arches = useRef<(HTMLDivElement | null)[]>([]);
  const handle = useRef<{ goTo: (i: number, d?: number) => void } | null>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const wanted = useSearchParams().get("item");
  const landed = useRef(false);
  const item = PASTRIES[active];

  useEffect(() => {
    if (!root.current || !stage.current || !case_.current || !sheen.current || PASTRIES.length === 0) return;
    const keep = <T,>(a: (T | null)[]) => a.filter((el): el is T => !!el);
    const h = startShelf(
      {
        root: root.current,
        stage: stage.current,
        case_: case_.current,
        sheen: sheen.current,
        crumbs: keep(crumbs.current),
        arches: keep(arches.current),
      },
      { palettes: PASTRIES, reduced: !!reduced, onIndex: setActive },
    );
    handle.current = h;
    const unregister = registerChapter("pastries", h.goTo);
    return () => {
      unregister();
      h.destroy();
    };
  }, [reduced]);

  // the menu sends ?item=<id>: open on it (instantly the first time, animated after)
  useEffect(() => {
    if (!wanted) return;
    const i = PASTRIES.findIndex((x) => x.id === wanted);
    if (i < 0) return;
    const first = !landed.current;
    landed.current = true;
    const t = window.setTimeout(() => handle.current?.goTo(i, first ? 0 : 900), first ? 60 : 0);
    return () => window.clearTimeout(t);
  }, [wanted]);

  if (PASTRIES.length === 0) return null;

  return (
    <section
      ref={root}
      id="pastries"
      className="chapter shelf"
      style={{ height: `${PASTRIES.length * 95 + 15}svh` }}
      aria-labelledby="shelf-title"
    >
      <div ref={stage} className="chapter__stage">
        {CRUMBS.map((c, i) => (
          <div
            key={i}
            ref={(el) => { crumbs.current[i] = el; }}
            className="shelf__crumb"
            aria-hidden="true"
            style={{ ["--x" as string]: `${c.x}%`, ["--y" as string]: `${c.y}%`, ["--w" as string]: `${c.w}px` }}
          />
        ))}

        <div ref={case_} className="shelf__case" aria-hidden="true">
          <div className="shelf__plank" />
        </div>

        <ChapterWord item={item} />

        <div className="chapter__items">
          {PASTRIES.map((it, n) => (
            <div
              key={it.id}
              ref={(el) => { arches.current[n] = el; }}
              className="chapter__item"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- transformed every frame */}
              <img src={it.img} alt={it.name} draggable={false} decoding="async" loading={n === 0 ? "eager" : "lazy"} />
            </div>
          ))}
        </div>

        <div className="shelf__glass" aria-hidden="true">
          <div ref={sheen} className="shelf__sheen" />
        </div>

        <ChapterCopy item={item} kicker="From the case" cta="Add to box" titleId="shelf-title" />
        <ChapterPicks
          items={PASTRIES}
          active={active}
          onPick={(i) => handle.current?.goTo(i)}
          label="Choose a pastry"
          layoutId="pastry-pick-active"
        />
      </div>
    </section>
  );
}
