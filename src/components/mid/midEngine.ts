/**
 * Flavour wheel engine. Scroll turns a wheel of drinks; each flavour rests at
 * the top of the arc for half of its scroll span, then rolls on. Every colour
 * on the stage (ground, glow, word, text, button, ring) is interpolated from
 * the flavour palette at the same eased position, so style follows the drink
 * continuously instead of snapping.
 */
import { createSnap } from "@/lib/scrollSnap";
import { setBox, setHidden, setOpacity, setTransform, setZ } from "@/lib/fastStyle";
import { mixPalettes, type Palette } from "@/lib/palette";

export type MidPalette = Palette;

export type MidRefs = {
  root: HTMLElement;
  stage: HTMLElement;
  ring: HTMLElement;
  glow: HTMLElement;
  /** three background circles: [large disc, small solid orb, dotted ring] */
  orbs: HTMLElement[];
  items: HTMLElement[];
};

export type MidHandle = { destroy: () => void; goTo: (index: number, dur?: number) => void };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const WHEEL_STEP = 34; // degrees between drinks on the arc

export function startMid(
  refs: MidRefs,
  opts: { palettes: MidPalette[]; reduced: boolean; onIndex: (i: number) => void },
): MidHandle {
  const { root, stage, ring, glow, orbs, items } = refs;
  const N = items.length;
  const mixInto = mixPalettes(opts.palettes);
  const reduced = opts.reduced;
  let raf = 0;
  let disposed = false;
  let visible = false;
  let last = performance.now();
  const t0 = last;
  let prog = 0;
  let progTarget = 0;
  let current = -1;
  const ptr = { tx: 0, ty: 0, x: 0, y: 0 };
  let W = 1, H = 1, phone = false;
  let painted = 0;

  /**
   * Everything that only moves when the window does. Sizes in particular are
   * written here and never in a frame: setting width or height costs a layout
   * pass, and on a phone doing that for ten elements sixty times a second is
   * most of the frame budget.
   */
  const g = {
    cx: 0, cy: 0, R: 0, itemH: 0, glow: 0,
    orb: [0, 0, 0],
    orbit: [0, 0, 0],
  };

  const measure = () => {
    const r = stage.getBoundingClientRect();
    W = r.width;
    H = r.height;
    phone = W <= 720;
    g.cx = W * (phone ? 0.5 : 0.69);
    g.cy = H * (phone ? 1.12 : 1.22);
    g.R = H * (phone ? 0.5 : 0.74);
    g.itemH = H * (phone ? 0.42 : 0.62);
    g.glow = H * (phone ? 0.46 : 0.66);
    const sm = phone ? 0.72 : 1;
    g.orb = [H * 0.78 * sm, H * 0.3 * sm, H * 0.46 * sm];
    g.orbit = [H * 0.05 * sm, H * 0.27 * sm, H * 0.24 * sm];
    setBox(ring, g.R * 2, g.R * 2);
    setBox(glow, g.glow, g.glow);
    orbs.forEach((el, i) => el && setBox(el, g.orb[i], g.orb[i]));
    items.forEach((el) => setBox(el, null, g.itemH));
  };

  const readScroll = () => {
    progTarget = snap.progress();
  };

  /** progress -> wheel position with a hold on every flavour */
  const toPos = (p: number) => {
    const f = p * (N - 1);
    const i = Math.min(N - 2, Math.floor(f));
    // snapping provides the rests, so the roll only needs soft ends
    return i + smooth(0.06, 0.94, f - i);
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed) return;
    // On a phone at rest the only motion left is the slow ornament drift, which
    // reads the same at half the rate — and halving it halves the work.
    if (
      phone &&
      !reduced &&
      now - painted < 32 &&
      Math.abs(progTarget - prog) < 0.0004 &&
      Math.abs(ptr.tx - ptr.x) < 0.002 &&
      Math.abs(ptr.ty - ptr.y) < 0.002
    ) {
      raf = requestAnimationFrame(frame);
      return;
    }
    painted = now;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const t = (now - t0) / 1000;
    const k = (rate: number) => (reduced ? 1 : 1 - Math.exp(-rate * dt));
    prog = lerp(prog, progTarget, k(11));
    ptr.x = lerp(ptr.x, ptr.tx, k(4));
    ptr.y = lerp(ptr.y, ptr.ty, k(4));
    const pos = toPos(prog);

    // ---- palette: set on the section so the sticky stage and its ground stay one colour ----
    mixInto(root.style, pos);

    const idx = Math.round(pos);
    if (idx !== current) {
      current = idx;
      opts.onIndex(idx);
    }

    // ---- wheel geometry (px, measured on resize) ----
    const { cx, cy, R, glow: gs } = g;

    setTransform(ring, `translate3d(${(cx - R).toFixed(1)}px, ${(cy - R).toFixed(1)}px, 0) rotate(${(-pos * WHEEL_STEP).toFixed(3)}deg)`);
    setTransform(
      glow,
      `translate3d(${(cx - gs / 2 + ptr.x * 10).toFixed(1)}px, ${(cy - R - gs / 2 + ptr.y * 8).toFixed(1)}px, 0) scale(${(1 + Math.sin(t * 0.8) * (reduced ? 0 : 0.015)).toFixed(4)})`,
    );

    // ---- the three circles behind the drink ----
    // each rides its own orbit around the resting drink, driven by the same wheel position,
    // and breathes up between flavours so a change reads as a pulse
    const ax = cx, ay = cy - R; // resting drink centre
    const between = Math.sin((pos - Math.floor(pos)) * Math.PI); // 0 at rest, 1 mid-roll
    const orb = (el: HTMLElement | undefined, i: number, angleDeg: number, scale: number, spin = 0) => {
      if (!el) return;
      const size = g.orb[i];
      const orbit = g.orbit[i];
      const a = (angleDeg * Math.PI) / 180;
      const px = ax + Math.cos(a) * orbit - size / 2 + ptr.x * orbit * 0.06;
      const py = ay + Math.sin(a) * orbit - size / 2 + ptr.y * orbit * 0.05;
      setTransform(el, `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) rotate(${spin.toFixed(2)}deg) scale(${scale.toFixed(4)})`);
    };
    // A: the big pale disc, drifting slightly left and up
    orb(orbs[0], 0, 200 - pos * 25, 1 + between * 0.06);
    // B: the solid colour orb, swinging round the lower side of the cup
    orb(orbs[1], 1, 35 + pos * 55 + (reduced ? 0 : Math.sin(t * 0.5) * 4), 1 - between * 0.25);
    // C: the dotted ring, offset the other way and turning with the wheel
    orb(orbs[2], 2, 215 + pos * 40, 1 + between * 0.12, pos * 90 + (reduced ? 0 : t * 6));

    for (let n = 0; n < N; n++) {
      const el = items[n];
      const d = n - pos;
      const ad = Math.abs(d);
      const a = (d * WHEEL_STEP * Math.PI) / 180;
      const x = cx + Math.sin(a) * R;
      const y = cy - Math.cos(a) * R;
      const scale = 1 - Math.min(ad, 2) * 0.24;
      const lean = d * WHEEL_STEP * 0.55;
      const front = clamp(1 - ad);
      const tiltY = ptr.x * 14 * front;
      const tiltX = -ptr.y * 8 * front;
      const bob = reduced ? 0 : Math.sin(t * 1.3 + n) * 4 * front;
      setTransform(
        el,
        `translate3d(${x.toFixed(1)}px, ${(y + bob).toFixed(1)}px, 0) translate(-50%, -50%) ` +
          `rotate(${lean.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) rotateX(${tiltX.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
      );
      // drinks that have rolled past leave quickly so they never sit under the copy
      setOpacity(el, d < 0 ? 1 - smooth(phone ? 0.3 : 0.4, phone ? 0.8 : 1, ad) : 1 - smooth(1.6, 2.4, ad));
      setZ(el, 10 - Math.round(ad * 2));
      setHidden(el, ad > 0.5);
    }

    if (visible && !reduced) raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    if (raf || disposed) return;
    raf = requestAnimationFrame(frame);
  };

  // one wheel gesture / key press / swipe = one flavour (shared with the other chapters)
  const snap = createSnap({
    root,
    stage,
    count: N,
    reduced,
    onProgress: () => {
      readScroll();
      kick();
    },
  });

  const onResize = () => {
    measure();
    readScroll();
    kick();
  };
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = stage.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
  };
  const onLeave = () => {
    ptr.tx = ptr.ty = 0;
  };

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) {
      last = performance.now();
      kick();
    }
  });
  io.observe(root);
  const ro = new ResizeObserver(onResize);
  ro.observe(stage);
  stage.addEventListener("pointermove", onPointer, { passive: true });
  stage.addEventListener("pointerleave", onLeave);
  measure();
  readScroll();
  prog = progTarget;
  kick();

  return {
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      snap.destroy();
      io.disconnect();
      ro.disconnect();
      stage.removeEventListener("pointermove", onPointer);
      stage.removeEventListener("pointerleave", onLeave);
    },
    /** Scroll so flavour `index` rests at the top of the wheel. */
    goTo(index: number, dur?: number) {
      snap.goTo(index, dur);
    },
  };
}
