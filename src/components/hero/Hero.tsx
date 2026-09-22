"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BEANS, NOTES, type Bean } from "./beans";
import { startHero } from "./heroEngine";
import SiteHeader from "@/components/site/SiteHeader";
import "./hero.css";

const WORD = "Cumbre";
const tap = { type: "spring", stiffness: 520, damping: 26 } as const;

function beanStyle(b: Bean): React.CSSProperties {
  return {
    ["--xd" as string]: `${b.xd}%`,
    ["--yd" as string]: `${b.yd}%`,
    ["--sd" as string]: b.sd,
    ["--xm" as string]: `${b.xm}%`,
    ["--ym" as string]: `${b.ym}%`,
    ["--sm" as string]: b.sm,
    ["--blur" as string]: `${b.blur}px`,
    transform: `rotate(${b.rot}deg)`,
  };
}

function BeanLayer({ layer, register }: { layer: Bean["layer"]; register: (el: HTMLImageElement | null) => void }) {
  return (
    <div className={`hero__beans hero__beans--${layer}`} aria-hidden="true">
      {BEANS.filter((b) => b.layer === layer).map((b, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- tiny decorative webps, transforms every frame
        <img
          key={`${layer}-${i}`}
          ref={register}
          className="bean"
          src={b.src}
          alt=""
          draggable={false}
          decoding="async"
          data-d={b.d}
          data-rot={b.rot}
          style={beanStyle(b)}
        />
      ))}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 13 13 3M5.5 3H13v7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const word = useRef<HTMLParagraphElement>(null);
  const disc = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const aside = useRef<HTMLElement>(null);
  const meta = useRef<HTMLDivElement>(null);
  const beans = useRef<Set<HTMLImageElement>>(new Set());
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = useState<"on" | "off">("on");

  const register = (el: HTMLImageElement | null) => {
    if (el) beans.current.add(el);
  };

  useEffect(() => {
    if (!root.current || !stage.current || !canvas.current || !word.current || !disc.current || !shadow.current || !copy.current) return;
    return startHero(
      {
        root: root.current,
        stage: stage.current,
        canvas: canvas.current,
        word: word.current,
        disc: disc.current,
        shadow: shadow.current,
        copy: copy.current,
        aside: aside.current,
        meta: meta.current,
        beans: [...beans.current].filter((el) => el.isConnected),
      },
      { modelUrl: "/models/cup.glb", reduced: !!reduced, onWebglFail: () => setWebgl("off") },
    );
  }, [reduced]);

  return (
    <section ref={root} id="home" className="hero js-intro" data-webgl={webgl} aria-labelledby="hero-title">
      <div ref={stage} className="hero__stage">
        <div className="hero__stripes" aria-hidden="true" />
        <div ref={disc} className="hero__disc" aria-hidden="true" />

        <p ref={word} className="hero__word" aria-hidden="true">
          {WORD.split("").map((ch, i) => (
            <span key={i} style={{ ["--i" as string]: i }}>
              {ch}
            </span>
          ))}
        </p>

        <BeanLayer layer="back" register={register} />
        <div ref={shadow} className="hero__shadow" aria-hidden="true" />
        <canvas ref={canvas} className="hero__cup" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element -- only shown when WebGL2 is unavailable */}
        <img className="hero__poster" src="/images/cup-poster.webp" alt="" aria-hidden="true" />
        <BeanLayer layer="front" register={register} />

        <SiteHeader current="home" />

        <div ref={copy} className="hero__copy">
          <p className="hero__eyebrow hero__reveal" style={{ ["--i" as string]: 0 }}>
            <i aria-hidden="true" /> Small-batch coffee bar
          </p>
          <h1 id="hero-title" className="hero__title">
            <span className="line serif"><span style={{ ["--i" as string]: 0 }}>Every cup,</span></span>
            <span className="line wine"><span style={{ ["--i" as string]: 1 }}>roasted</span></span>
            <span className="line"><span style={{ ["--i" as string]: 2 }}>slow.</span></span>
          </h1>
          <p className="hero__lead hero__reveal" style={{ ["--i" as string]: 1 }}>
            High-altitude beans, roasted a little at a time and poured the same week. Nothing sits on a shelf.
          </p>
          <div className="hero__actions hero__reveal" style={{ ["--i" as string]: 2 }}>
            <motion.a className="btn btn--wine" href="#order" whileTap={{ scale: 0.95 }} transition={tap}>
              Order a cup
              <span className="btn__dot"><Arrow /></span>
            </motion.a>
            <motion.a className="btn btn--ghost" href="/coffee" whileTap={{ scale: 0.95 }} transition={tap}>
              See the menu
            </motion.a>
          </div>
        </div>

        <aside ref={aside} className="hero__aside" aria-label="Tasting notes">
          <div className="hero__reveal" style={{ ["--i" as string]: 3 }}>
          <h2>In the cup</h2>
          <ul className="notes">
            {NOTES.map((n) => (
              <li key={n.name}>
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
                <img src={n.src} alt="" />
                <div>
                  <b>{n.name}</b>
                  <span>{n.body}</span>
                </div>
              </li>
            ))}
          </ul>
          </div>
        </aside>

        <div ref={meta} className="hero__meta">
          <ul className="hero__reveal" style={{ ["--i" as string]: 4 }}>
            <li>Single origin</li>
            <li>Washed</li>
            <li>Medium roast</li>
          </ul>
          <span className="hero__live hero__reveal" style={{ ["--i" as string]: 5 }}><i aria-hidden="true" /> Brewing now</span>
        </div>
      </div>
    </section>
  );
}
