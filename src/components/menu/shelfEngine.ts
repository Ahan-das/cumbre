/**
 * Pastry chapter: a bakery display case. Each pastry sits in its own arched
 * window, and scrolling moves the case vertically like a dumbwaiter, one shelf
 * at a time. A sheen crosses the glass as a new arch settles.
 */
import { createSnap, type Snap } from "@/lib/scrollSnap";
import { mixPalettes, type Palette } from "@/lib/palette";

export type ShelfRefs = {
  root: HTMLElement;
  stage: HTMLElement;
  case_: HTMLElement;
  sheen: HTMLElement;
  crumbs: HTMLElement[];
  arches: HTMLElement[];
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function startShelf(
  refs: ShelfRefs,
  opts: { palettes: Palette[]; reduced: boolean; onIndex: (i: number) => void },
): { destroy: () => void; goTo: Snap["goTo"] } {
  const { root, stage, case_, sheen, crumbs, arches } = refs;
  const N = arches.length;
  const reduced = opts.reduced;
  const mix = mixPalettes(opts.palettes);

  let raf = 0;
  let disposed = false;
  let visible = false;
  let prog = 0;
  let progTarget = 0;
  let current = -1;
  let last = performance.now();
  const t0 = last;
  const ptr = { tx: 0, ty: 0, x: 0, y: 0 };
  let W = 1, H = 1, phone = false;

  const measure = () => {
    const r = stage.getBoundingClientRect();
    W = r.width;
    H = r.height;
    phone = W <= 720;
  };
  const readScroll = () => {
    const r = root.getBoundingClientRect();
    progTarget = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const t = (now - t0) / 1000;
    const k = (rate: number) => (reduced ? 1 : 1 - Math.exp(-rate * dt));
    prog = lerp(prog, progTarget, k(11));
    ptr.x = lerp(ptr.x, ptr.tx, k(4));
    ptr.y = lerp(ptr.y, ptr.ty, k(4));

    const pos = prog * (N - 1);
    mix(root.style, pos);
    const idx = Math.round(pos);
    if (idx !== current) {
      current = idx;
      opts.onIndex(idx);
    }

    const frac = pos - Math.floor(pos);
    const between = Math.sin(frac * Math.PI);
    const pitch = H * (phone ? 0.62 : 0.78); // distance between shelves
    const cx = W * (phone ? 0.5 : 0.7);
    const cy = H * (phone ? 0.58 : 0.5);
    const archH = H * (phone ? 0.46 : 0.66);

    // the case itself leans with the pointer, which sells the glass
    case_.style.transform = `rotateY(${(ptr.x * 4).toFixed(2)}deg) rotateX(${(-ptr.y * 2.5).toFixed(2)}deg)`;

    // a sheen sweeps the glass as each arch arrives
    sheen.style.opacity = (between * 0.55).toFixed(3);
    sheen.style.transform = `translate3d(${((frac - 0.5) * W * 0.9).toFixed(1)}px, 0, 0) rotate(14deg)`;

    for (let n = 0; n < N; n++) {
      const el = arches[n];
      const d = n - pos;
      const ad = Math.abs(d);
      const y = cy + d * pitch;
      const scale = 1 - Math.min(ad, 2) * 0.22;
      const op = 1 - smooth(0.85, 1.8, ad);
      el.style.height = `${archH.toFixed(1)}px`;
      el.style.transform =
        `translate3d(${(cx + ptr.x * 10 * clamp(1 - ad)).toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(4)})`;
      el.style.opacity = op.toFixed(3);
      el.style.zIndex = String(10 - Math.round(ad * 2));
      el.setAttribute("aria-hidden", ad > 0.5 ? "true" : "false");
    }

    // crumbs settle downward and hop a little on each change
    crumbs.forEach((c, i) => {
      const ph = i * 1.3;
      const dx = (reduced ? 0 : Math.sin(t * 0.4 + ph) * 6) + ptr.x * (6 + (i % 4) * 4);
      const dy = (reduced ? 0 : Math.abs(Math.sin(t * 0.8 + ph)) * -5) - between * 10;
      c.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${(i * 53 + (reduced ? 0 : t * 5)).toFixed(1)}deg)`;
    });

    if (visible && !reduced) raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    if (raf || disposed) return;
    raf = requestAnimationFrame(frame);
  };
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
    goTo: snap.goTo,
  };
}
