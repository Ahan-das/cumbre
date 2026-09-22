"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { searchMenu, type MenuEntry } from "@/lib/menuIndex";
import { MENU_EVENT } from "@/lib/menuRegistry";
import { setSnapLock } from "@/lib/scrollSnap";
import "./menu-launcher.css";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The header's Menu button. Opens a panel where you can type to filter every
 * item on the site, or pick one from the list; choosing one scrolls to that
 * item inside its chapter.
 */
export default function MenuLauncher() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const [past, setPast] = useState(false); // past the hero, so show the floating button
  const input = useRef<HTMLInputElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const router = useRouter();

  const results = useMemo(() => searchMenu(q), [q]);

  // open from anywhere (the hero nav dispatches this)
  useEffect(() => {
    const onAsk = () => {
      opener.current = document.activeElement as HTMLElement;
      setOpen(true);
    };
    window.addEventListener(MENU_EVENT, onAsk);
    return () => window.removeEventListener(MENU_EVENT, onAsk);
  }, []);

  // the floating button waits until the hero is completely behind you.
  // On pages with no hero it appears once the header has scrolled away.
  useEffect(() => {
    const hero = document.getElementById("home");
    if (!hero) {
      const onScroll = () => setPast(window.scrollY > 160);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting), { threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  // while the panel is open the page behind must stay put: the chapters stop
  // reading wheel/touch, and anything outside the results list swallows the scroll
  // (the list itself keeps scrolling, and overscroll-behavior stops it chaining)
  useEffect(() => {
    setSnapLock(open);
    document.documentElement.classList.toggle("is-modal", open);
    if (!open) return;
    const el = scrim.current;
    if (!el) return;
    const swallow = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest(".menu-results")) e.preventDefault();
    };
    el.addEventListener("wheel", swallow, { passive: false });
    el.addEventListener("touchmove", swallow, { passive: false });
    return () => {
      el.removeEventListener("wheel", swallow);
      el.removeEventListener("touchmove", swallow);
    };
  }, [open]);

  useEffect(() => () => {
    setSnapLock(false);
    document.documentElement.classList.remove("is-modal");
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setCursor(0);
    const t = window.setTimeout(() => input.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    setOpen(false);
    opener.current?.focus?.();
  };

  const choose = (entry: MenuEntry) => {
    close();
    // each item lives on its own page; the ?item= tells that page where to open
    router.push(entry.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => {
        const n = results.length;
        if (!n) return 0;
        const next = (c + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
        list.current?.children[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[cursor] ?? results[0];
      if (hit) choose(hit);
    }
  };

  let lastGroup = "";

  return (
    <>
      <motion.button
        type="button"
        className="menu-fab"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          opener.current = null;
          setOpen(true);
        }}
        initial={false}
        animate={past && !open ? { y: 0, opacity: 1, pointerEvents: "auto" } : { y: -70, opacity: 0, pointerEvents: "none" }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <span className="menu-fab__bars" aria-hidden="true">
          <i /><i /><i />
        </span>
        Menu
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={scrim}
            className="menu-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <motion.div
              className="menu-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={{ y: -18, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -12, scale: 0.99, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <div className="menu-panel__head">
                <label className="menu-search">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="5.4" stroke="currentColor" strokeWidth="1.7" />
                    <path d="m12.2 12.2 3.3 3.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <span className="sr-only">Search the menu</span>
                  <input
                    ref={input}
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setCursor(0);
                    }}
                    onKeyDown={onKeyDown}
                    placeholder="Type a drink, a scoop, a pastry…"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <button type="button" className="menu-close" onClick={close} aria-label="Close menu">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <ul className="menu-results" ref={list} role="listbox" aria-label="Menu items">
                {results.map((entry, i) => {
                  const head = entry.group !== lastGroup ? entry.group : null;
                  lastGroup = entry.group;
                  return (
                    <li key={entry.id} role="option" aria-selected={i === cursor}>
                      {head && (
                        <span className="menu-group">
                          {head}
                          <button
                            type="button"
                            className="menu-group__all"
                            onClick={() => {
                              close();
                              router.push(entry.href.split("?")[0]);
                            }}
                          >
                            See all
                          </button>
                        </span>
                      )}
                      <button
                        type="button"
                        className={`menu-item${i === cursor ? " is-cursor" : ""}`}
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => choose(entry)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail */}
                        <img src={entry.img} alt="" />
                        <span className="menu-item__name">{entry.name}</span>
                        <span className="menu-item__price">{entry.price}</span>
                      </button>
                    </li>
                  );
                })}
                {results.length === 0 && (
                  <li className="menu-empty">
                    Nothing by that name. We do have coffee, ice cream and pastries.
                  </li>
                )}
              </ul>

              <p className="menu-hint">
                <kbd>↑</kbd><kbd>↓</kbd> to move, <kbd>Enter</kbd> to jump, <kbd>Esc</kbd> to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
