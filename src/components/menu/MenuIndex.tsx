"use client";

import { motion } from "framer-motion";
import "./menu.css";

const ROWS = [
  { href: "#about", label: "Coffee", note: "Hot, cold and the four-flavour cold bar" },
  { href: "#ice-cream", label: "Ice cream", note: "Scooped to order, cone or cup" },
  { href: "#pastries", label: "Pastries", note: "Baked here, out of the case by six" },
];

/** A short index between the chapters, so the Menu nav item lands somewhere real. */
export default function MenuIndex() {
  return (
    <section id="menu" className="index" aria-labelledby="index-title">
      <h2 id="index-title" className="index__title">
        <span>The</span> menu
      </h2>
      <ul className="index__rows">
        {ROWS.map((r, i) => (
          <li key={r.href}>
            <motion.a className="index__row" href={r.href} whileHover="on" initial="off" animate="off">
              <span className="index__label">{r.label}</span>
              <span className="index__note">{r.note}</span>
              <motion.span className="index__arrow" variants={{ off: { x: 0 }, on: { x: 8 } }} transition={{ type: "spring", stiffness: 420, damping: 28 }} aria-hidden="true">
                &#8594;
              </motion.span>
              <motion.i className="index__rule" variants={{ off: { scaleX: 0 }, on: { scaleX: 1 } }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} aria-hidden="true" />
              <span className="sr-only">, {i + 1} of {ROWS.length}</span>
            </motion.a>
          </li>
        ))}
      </ul>
    </section>
  );
}
