"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FLAVOURS } from "./flavours";
import { startMid, WHEEL_STEP, type MidHandle } from "./midEngine";
import { registerChapter } from "@/lib/menuRegistry";
import AddToOrder from "@/components/site/AddToOrder";
import "./mid.css";

const EASE = [0.16, 1, 0.3, 1] as const;

/* Word swap: letters rise in from the baseline and leave upward. Framer's
   AnimatePresence is the right tool here: enter + exit on keyed content. */
const letters = {
  enter: { transition: { staggerChildren: 0.035 } },
  exit: { transition: { staggerChildren: 0.02 } },
};
const letter = {
  initial: { y: "105%" },
  enter: { y: "0%", transition: { duration: 0.75, ease: EASE } },
  exit: { y: "-105%", transition: { duration: 0.4, ease: [0.7, 0, 0.84, 0] as const } },
};
const copySwap = {
  initial: { opacity: 0, y: 14, filter: "blur(4px)" },
  enter: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: EASE, delay: 0.08 } },
  exit: { opacity: 0, y: -10, filter: "blur(4px)", transition: { duration: 0.25 } },
};


export default function FlavourWheel() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const orbs = useRef<(HTMLDivElement | null)[]>([]);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const handle = useRef<MidHandle | null>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const wanted = useSearchParams().get("item");
  const landed = useRef(false);
  const f = FLAVOURS[active];

  useEffect(() => {
    if (!root.current || !stage.current || !ring.current || !glow.current) return;
    const h = startMid(
      {
        root: root.current,
        stage: stage.current,
        ring: ring.current,
        glow: glow.current,
        orbs: orbs.current.filter((el): el is HTMLDivElement => !!el),
        items: items.current.filter((el): el is HTMLDivElement => !!el),
      },
      { palettes: FLAVOURS, reduced: !!reduced, onIndex: setActive },
    );
    handle.current = h;
    const unregister = registerChapter("coffee", h.goTo);
    return () => {
      unregister();
      h.destroy();
    };
  }, [reduced]);

  // the menu sends ?item=<id>: open on it (instantly the first time, animated after)
  useEffect(() => {
    if (!wanted) return;
    const i = FLAVOURS.findIndex((x) => x.id === wanted);
    if (i < 0) return;
    const first = !landed.current;
    landed.current = true;
    const t = window.setTimeout(() => handle.current?.goTo(i, first ? 0 : 900), first ? 60 : 0);
    return () => window.clearTimeout(t);
  }, [wanted]);

  return (
    <section ref={root} id="about" className="mid" aria-labelledby="mid-title">
      <div ref={stage} className="mid__stage">
        <p className="mid__word" aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={f.id}
              className="mid__word-inner"
              variants={letters}
              initial="initial"
              animate="enter"
              exit="exit"
            >
              {f.word.split("").map((ch, i) => (
                <motion.span key={i} variants={letter}>
                  {ch}
                </motion.span>
              ))}
            </motion.span>
          </AnimatePresence>
        </p>

        <div ref={ring} className="mid__ring" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <circle className="track" cx="100" cy="100" r="99.5" />
            {FLAVOURS.map((_, n) => {
              const a = (n * WHEEL_STEP * Math.PI) / 180;
              return <circle key={n} className="dot" cx={100 + Math.sin(a) * 99.5} cy={100 - Math.cos(a) * 99.5} r="0.7" />;
            })}
          </svg>
        </div>
        <div ref={glow} className="mid__glow" aria-hidden="true" />
        <div ref={(el) => { orbs.current[0] = el; }} className="mid__orb mid__orb--disc" aria-hidden="true" />
        <div ref={(el) => { orbs.current[1] = el; }} className="mid__orb mid__orb--solid" aria-hidden="true" />
        <div ref={(el) => { orbs.current[2] = el; }} className="mid__orb mid__orb--ring" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <circle className="r1" cx="50" cy="50" r="49" />
            <circle className="r2" cx="50" cy="50" r="42" />
          </svg>
        </div>

        <div className="mid__drinks">
          {FLAVOURS.map((fl, n) => (
            <div
              key={fl.id}
              ref={(el) => {
                items.current[n] = el;
              }}
              className="mid__drink"
              style={{ ["--ar" as string]: fl.w }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- transformed every frame, sized by the engine */}
              <img src={fl.img} alt={fl.name} draggable={false} decoding="async" loading={n === 0 ? "eager" : "lazy"} />
            </div>
          ))}
        </div>

        <div className="mid__copy">
          <h2 id="mid-title" className="mid__eyebrow">
            <i aria-hidden="true" /> The cold bar
          </h2>
          <div className="mid__swap" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={f.id} variants={copySwap} initial="initial" animate="enter" exit="exit">
                <h3 className="mid__name">{f.name}</h3>
                <p className="mid__line">{f.line}</p>
                <div className="mid__buy">
                  <span className="mid__price">{f.price}</span>
                  <AddToOrder id={f.id} name={f.name} price={f.price} img={f.img} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <ul className="mid__cards" aria-label="Choose a flavour">
          {FLAVOURS.map((fl, n) => (
            <li key={fl.id}>
              <button
                type="button"
                className="mid__card"
                aria-pressed={n === active}
                aria-label={`${fl.name}, ${fl.price}`}
                onClick={() => handle.current?.goTo(n)}
              >
                {n === active && (
                  <motion.span
                    layoutId="mid-card-active"
                    className="mid__card-active"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative thumbnail */}
                <img src={fl.img} alt="" />
                <div>
                  <b>{fl.word}</b>
                  <small>{fl.price}</small>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
