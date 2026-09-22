/**
 * Style writes that skip the DOM when nothing actually changed.
 *
 * The chapter engines recompute every element every frame, but most of those
 * values are identical to the last frame: the z-index of a drink only changes
 * as it passes another, aria-hidden only at the halfway mark, and width/height
 * usually only when the window resizes. Letting those through costs a style
 * recalculation each time — and for width/height, a whole layout pass — which
 * is what makes a phone stutter. Everything here compares first and writes
 * second.
 */
type Slot = {
  t?: string;
  o?: string;
  z?: string;
  w?: number;
  h?: number;
  a?: boolean;
  v?: string;
};

const slots = new WeakMap<HTMLElement, Slot>();

const slotOf = (el: HTMLElement): Slot => {
  let s = slots.get(el);
  if (!s) slots.set(el, (s = {}));
  return s;
};

export function setTransform(el: HTMLElement, value: string) {
  const s = slotOf(el);
  if (s.t === value) return;
  s.t = value;
  el.style.transform = value;
}

export function setOpacity(el: HTMLElement, value: number) {
  const s = slotOf(el);
  const v = value.toFixed(3);
  if (s.o === v) return;
  s.o = v;
  el.style.opacity = v;
}

export function setZ(el: HTMLElement, value: number) {
  const s = slotOf(el);
  const v = String(value);
  if (s.z === v) return;
  s.z = v;
  el.style.zIndex = v;
}

export function setHidden(el: HTMLElement, hidden: boolean) {
  const s = slotOf(el);
  if (s.a === hidden) return;
  s.a = hidden;
  el.setAttribute("aria-hidden", hidden ? "true" : "false");
}

export function setVisible(el: HTMLElement, visible: boolean) {
  const s = slotOf(el);
  const v = visible ? "visible" : "hidden";
  if (s.v === v) return;
  s.v = v;
  el.style.visibility = v;
}

/** Width and/or height in px. Layout-triggering, so only on a real change. */
export function setBox(el: HTMLElement, w: number | null, h: number | null) {
  const s = slotOf(el);
  if (w !== null && (s.w === undefined || Math.abs(s.w - w) > 0.05)) {
    s.w = w;
    el.style.width = `${w.toFixed(1)}px`;
  }
  if (h !== null && (s.h === undefined || Math.abs(s.h - h) > 0.05)) {
    s.h = h;
    el.style.height = `${h.toFixed(1)}px`;
  }
}

/**
 * Document-space geometry of a pinned section, cached.
 *
 * `top` and `travel` only change when the page is laid out again, but scroll
 * handlers need them on every event — and reading them during a scroll forces
 * the browser to flush layout right after the frame just wrote to it. Reading
 * once and recomputing on resize keeps scrolling read-free.
 */
export type SectionGeo = {
  /** distance from the top of the document to the section */
  top: number;
  /** scrollable distance inside the section */
  travel: number;
  /** section height */
  height: number;
};

export function measureSection(root: HTMLElement): SectionGeo {
  const r = root.getBoundingClientRect();
  return {
    top: window.scrollY + r.top,
    travel: Math.max(1, r.height - window.innerHeight),
    height: r.height,
  };
}
