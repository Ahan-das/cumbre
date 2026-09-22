"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toAmount, useCart } from "@/lib/cart";
import "./site.css";

/** The "Add to …" button on every item. Puts the item in the bag and says so. */
export default function AddToOrder({
  id,
  name,
  price,
  img,
  label = "Add to order",
  className = "btn btn--flavour",
}: {
  id: string;
  name: string;
  price: string;
  img: string;
  label?: string;
  className?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <motion.button
      type="button"
      className={`${className} add-btn`}
      data-added={added ? "true" : undefined}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
      onClick={() => {
        add({ id, name, price: toAmount(price), img });
        setAdded(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setAdded(false), 1600);
      }}
    >
      <span className="add-btn__label">{added ? "Added" : label}</span>
      <span className="btn__dot">
        {added ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </motion.button>
  );
}
