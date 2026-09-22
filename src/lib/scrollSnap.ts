/**
 * Step-snapped scrolling for a pinned section: one wheel gesture, key press or
 * swipe moves exactly one item. Trackpad inertia can't skip items, a flick that
 * arrives from the previous section is absorbed, and at either end the page
 * scrolls on normally.
 *
 * Shared by every chapter of the site so they all feel the same.
 */
import { measureSection, type SectionGeo } from "./fastStyle";

export type SnapOptions = {
  root: HTMLElement;      // the tall section
  stage: HTMLElement;     // its sticky child (receives touch)
  count: number;          // number of items
  reduced: boolean;
  /** called when the scroll position changes; p is 0..1 across the section */
  onProgress?: (p: number) => void;
};

export type Snap = {
  destroy: () => void;
  goTo: (index: number, dur?: number) => void;
  step: (dir: number, dur?: number) => boolean;
  /** 0..1 raw scroll position across the section */
  progress: () => number;
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/**
 * One programmatic scroll at a time across the whole page: while a chapter is
 * animating (a menu jump can cross several sections), the others must not
 * settle or step, or they fight over the scroll position.
 */
let scrollOwner: object | null = null;

/**
 * Set while something on top of the page owns input (the menu panel): the
 * chapters then ignore wheel, keys and touch so the panel's own list scrolls.
 */
let inputLocked = false;
export function setSnapLock(locked: boolean) {
  inputLocked = locked;
}

export function createSnap(opts: SnapOptions): Snap {
  const { root, stage, count: N, reduced } = opts;
  const self = {};
  const busyElsewhere = () => inputLocked || (scrollOwner !== null && scrollOwner !== self);

  /**
   * Section geometry, measured once and kept until the page is laid out again.
   * Wheel, touch, key and scroll handlers all need it, and measuring inside a
   * scroll handler forces the browser to flush the layout the animation frame
   * just wrote — the single most expensive thing in this file on a phone.
   */
  let cache: SectionGeo | null = null;
  const invalidate = () => {
    cache = null;
  };
  const geo = () => {
    if (!cache) cache = measureSection(root);
    const y = window.scrollY;
    return {
      top: cache.top,
      travel: cache.travel,
      pinned: y >= cache.top - 1 && y <= cache.top + cache.travel + 1,
    };
  };
  const restY = (i: number) => {
    const g = geo();
    return g.top + (g.travel * i) / (N - 1);
  };
  const fIndex = () => {
    const g = geo();
    return clamp((window.scrollY - g.top) / g.travel) * (N - 1);
  };

  let anim = 0;
  let animating = false;
  let animIdx: number | null = null; // item the running animation is heading to
  const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  const animateTo = (y: number, dur = 850) => {
    cancelAnimationFrame(anim);
    const from = window.scrollY;
    if (reduced || Math.abs(y - from) < 2) {
      window.scrollTo(0, y);
      animating = false;
      animIdx = null;
      if (scrollOwner === self) scrollOwner = null;
      return;
    }
    animating = true;
    scrollOwner = self;
    const start = performance.now();
    const tick = (now: number) => {
      const x = clamp((now - start) / dur);
      window.scrollTo(0, from + (y - from) * easeInOut(x));
      opts.onProgress?.(fIndex() / (N - 1));
      if (x < 1) anim = requestAnimationFrame(tick);
      else {
        animating = false;
        animIdx = null;
        if (scrollOwner === self) scrollOwner = null;
      }
    };
    anim = requestAnimationFrame(tick);
  };

  // while an animation runs, count from where it is heading, so quick gestures queue up
  const baseF = () => (animating && animIdx !== null ? animIdx : fIndex());
  const targetOf = (dir: number) => {
    const f = baseF();
    const t = dir > 0 ? Math.floor(f + 0.02) + 1 : Math.ceil(f - 0.02) - 1;
    return Math.max(0, Math.min(N - 1, t));
  };
  /** true if a step in `dir` stays inside this section (false = let the page scroll on) */
  const canStep = (dir: number) => {
    const f = baseF();
    return dir > 0 ? f < N - 1 - 0.02 : f > 0.02;
  };
  const go = (i: number, dur?: number) => {
    animateTo(restY(i), dur);
    if (animating) animIdx = i;
  };
  const step = (dir: number, dur?: number) => {
    if (!canStep(dir)) return false;
    go(targetOf(dir), dur);
    return true;
  };

  // ---- wheel / trackpad: a gesture ends after a short silence, so inertia can't skip items
  let gesture = false;
  let gestureTimer = 0;
  let accum = 0;
  let lastWheel = 0;
  let wasPinned = false;
  const endGestureSoon = () => {
    window.clearTimeout(gestureTimer);
    gestureTimer = window.setTimeout(() => {
      gesture = false;
      accum = 0;
    }, 200);
  };
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (busyElsewhere()) {
      // a menu jump is in flight, or a dialog owns input: leave the wheel alone
      if (!inputLocked && geo().pinned) e.preventDefault();
      return;
    }
    const now = performance.now();
    const pinned = geo().pinned;
    const dir = Math.sign(e.deltaY);
    // arriving mid-flick from the section above: absorb the flick and settle on the first/last item
    if (pinned && !wasPinned && now - lastWheel < 160) {
      gesture = true;
      go(dir > 0 ? 0 : N - 1, 500);
    }
    wasPinned = pinned;
    lastWheel = now;
    if (!pinned || !dir) return;
    if (gesture || animating) {
      e.preventDefault();
      endGestureSoon();
      return;
    }
    if (!canStep(dir)) return; // native scroll out of the section
    e.preventDefault();
    accum += e.deltaY;
    endGestureSoon();
    if (Math.abs(accum) < 8) return;
    gesture = true;
    step(dir);
  };

  const onKey = (e: KeyboardEvent) => {
    if (busyElsewhere() || !geo().pinned || e.altKey || e.metaKey || e.ctrlKey) return;
    const t = e.target as HTMLElement | null;
    if (t && /input|textarea|select/i.test(t.tagName)) return;
    const dir = e.key === "ArrowDown" || e.key === "PageDown" ? 1 : e.key === "ArrowUp" || e.key === "PageUp" ? -1 : 0;
    if (!dir) return;
    if (step(dir)) e.preventDefault();
  };

  // ---- touch: a vertical or horizontal swipe on the stage = one item
  let tStart: { x: number; y: number; t: number } | null = null;
  let tMode: "snap" | "native" | null = null;
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1 || busyElsewhere()) return;
    tStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() };
    tMode = null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!tStart) return;
    const dx = e.touches[0].clientX - tStart.x;
    const dy = e.touches[0].clientY - tStart.y;
    if (tMode === null) {
      if (Math.hypot(dx, dy) < 6) return;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const dir = horizontal ? -Math.sign(dx) : -Math.sign(dy);
      // horizontal swipes are always ours; vertical ones only while this section can still step that way
      tMode = geo().pinned && (horizontal || animating || canStep(dir)) ? "snap" : "native";
    }
    if (tMode === "snap" && e.cancelable) e.preventDefault();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!tStart || tMode !== "snap") {
      tStart = null;
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - tStart.x;
    const dy = t.clientY - tStart.y;
    const min = performance.now() - tStart.t < 300 ? 24 : 50;
    tStart = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > min) step(-Math.sign(dx), 700);
    else if (Math.abs(dy) > min) step(-Math.sign(dy), 700);
  };

  // ---- anything else (scrollbar drag, momentum from outside): settle on the nearest item
  let settleTimer = 0;
  let lastY = window.scrollY;
  let lastDir = 0;
  const settle = () => {
    if (animating || gesture || tStart || busyElsewhere() || !geo().pinned) return;
    const f = fIndex();
    if (Math.abs(f - Math.round(f)) < 0.01) return;
    const t = lastDir > 0 ? Math.ceil(f - 0.25) : lastDir < 0 ? Math.floor(f + 0.25) : Math.round(f);
    go(Math.max(0, Math.min(N - 1, t)), 600);
  };

  const onScroll = () => {
    const y = window.scrollY;
    if (y !== lastY) lastDir = Math.sign(y - lastY);
    lastY = y;
    opts.onProgress?.(fIndex() / (N - 1));
    if (!animating) {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 140);
    }
  };

  // anything that can move the section in the document invalidates the cache
  const ro = new ResizeObserver(invalidate);
  ro.observe(root);
  ro.observe(document.documentElement);
  window.addEventListener("resize", invalidate, { passive: true });
  window.addEventListener("orientationchange", invalidate, { passive: true });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  stage.addEventListener("touchstart", onTouchStart, { passive: true });
  stage.addEventListener("touchmove", onTouchMove, { passive: false });
  stage.addEventListener("touchend", onTouchEnd, { passive: true });
  stage.addEventListener("touchcancel", onTouchEnd, { passive: true });

  return {
    destroy() {
      cancelAnimationFrame(anim);
      if (scrollOwner === self) scrollOwner = null;
      window.clearTimeout(gestureTimer);
      window.clearTimeout(settleTimer);
      ro.disconnect();
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("orientationchange", invalidate);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("touchcancel", onTouchEnd);
    },
    goTo: (i, dur) => go(Math.max(0, Math.min(N - 1, i)), dur),
    step,
    progress: () => fIndex() / (N - 1),
  };
}
