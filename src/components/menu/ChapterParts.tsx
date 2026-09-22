"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { MenuItem } from "./items";
import AddToOrder from "@/components/site/AddToOrder";

const EASE = [0.16, 1, 0.3, 1] as const;

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


/** The giant word, swapped letter by letter. */
export function ChapterWord({ item }: { item: MenuItem }) {
  return (
    <p className="chapter__word" aria-hidden="true">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={item.id} className="chapter__word-inner" variants={letters} initial="initial" animate="enter" exit="exit">
          {item.word.split("").map((ch, i) => (
            <motion.span key={i} variants={letter}>
              {ch === " " ? "\u00A0" : ch}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </p>
  );
}

export function ChapterCopy({ item, kicker, cta, titleId }: { item: MenuItem; kicker: string; cta: string; titleId: string }) {
  return (
    <div className="chapter__copy">
      <h2 id={titleId} className="chapter__kicker">
        <i aria-hidden="true" /> {kicker}
      </h2>
      <div className="chapter__swap" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={item.id} variants={copySwap} initial="initial" animate="enter" exit="exit">
            <h3 className="chapter__name">{item.name}</h3>
            <p className="chapter__line">{item.line}</p>
            <div className="chapter__buy">
              <span className="chapter__price">{item.price}</span>
              <AddToOrder id={item.id} name={item.name} price={item.price} img={item.img} label={cta} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function ChapterPicks({
  items,
  active,
  onPick,
  label,
  layoutId,
}: {
  items: MenuItem[];
  active: number;
  onPick: (i: number) => void;
  label: string;
  layoutId: string;
}) {
  return (
    <ul className="chapter__picks" aria-label={label}>
      {items.map((it, n) => (
        <li key={it.id}>
          <button
            type="button"
            className="chapter__pick"
            aria-pressed={n === active}
            aria-label={`${it.name}, ${it.price}`}
            onClick={() => onPick(n)}
          >
            {n === active && (
              <motion.span
                layoutId={layoutId}
                className="chapter__pick-active"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative thumbnail */}
            <img src={it.img} alt="" />
            <div>
              <b>{it.word}</b>
              <small>{it.price}</small>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
