/**
 * Ice cream chapter. Scroll doesn't turn a wheel here: the scoop you have
 * passed climbs into a stack at the top of the frame, so the pile grows as you
 * read down the flavours. Blobs and sprinkles drift behind it and re-tint with
 * the flavour.
 */
import { createSnap, type Snap } from "@/lib/scrollSnap";
import { mixPalettes, type Palette } from "@/lib/palette";

export type ScoopRefs = {
  root: HTMLElement;
  stage: HTMLElement;
  drip: HTMLElement;
  blobs: HTMLElement[];
  sprinkles: HTMLElement[];
  items: HTMLElement[];
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function startScoops(
  refs: ScoopRefs,
  opts: { palettes: Palette[]; reduced: boolean; onIndex: (i: number) => void },
): { destroy: () => void; goTo: Snap["goTo"] } {
  const { root, stage, drip, blobs, sprinkles, items } = refs;
  const N = items.length;
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

    const cx = W * (phone ? 0.5 : 0.68);
    const cy = H * (phone ? 0.64 : 0.56);
    const itemH = H * (phone ? 0.4 : 0.56);
    const between = Math.sin((pos - Math.floor(pos)) * Math.PI);

    // the melting lip at the top of the section sags a little between flavours
    drip.style.transform = `translate3d(0, ${(between * 8).toFixed(2)}px, 0) scaleY(${(1 + between * 0.12).toFixed(3)})`;

    for (let n = 0; n < N; n++) {
      const el = items[n];
      const d = n - pos;
      let x = cx, y = cy, scale = 1, rot = 0, op = 1, z = 10;
      if (d > 0) {
        // waiting below the frame
        y = cy + d * H * 0.72;
        scale = 1 - Math.min(d, 2) * 0.12;
        rot = d * 5;
        op = 1 - smooth(0.9, 1.9, d);
        z = 5 - Math.round(d);
      } else if (d < 0) {
        // stacked away: each one tucks up and to the side, smaller than the last
        const a = Math.min(-d, 3);
        x = cx + (phone ? W * 0.3 : W * 0.13) * smooth(0, 1, a) + a * (phone ? 3 : 8);
        y = cy - H * ((phone ? 0.2 : 0.26) + a * (phone ? 0.05 : 0.06));
        scale = 1 - (phone ? 0.58 : 0.46) * smooth(0, 1, a) - (a > 1 ? (a - 1) * 0.08 : 0);
        rot = -9 - a * 5;
        op = 1 - smooth(2.2, 3, a);
        z = 9 - Math.round(a);
      }
      const front = clamp(1 - Math.abs(d));
      const bob = reduced ? 0 : Math.sin(t * 1.2 + n) * 5 * (0.4 + front * 0.6);
      el.style.height = `${(itemH * (1 - Math.max(0, -d) * 0.06)).toFixed(1)}px`;
      el.style.transform =
        `translate3d(${(x + ptr.x * 12 * front).toFixed(1)}px, ${(y + bob + ptr.y * 8 * front).toFixed(1)}px, 0) translate(-50%, -50%) ` +
        `rotate(${(rot + (reduced ? 0 : Math.sin(t * 0.7 + n) * 1.5 * front)).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      el.style.opacity = op.toFixed(3);
      el.style.zIndex = String(z);
      el.setAttribute("aria-hidden", Math.abs(d) > 0.5 ? "true" : "false");
    }

    // blobs: slow drift, a small swell when the flavour changes
    blobs.forEach((b, i) => {
      const sp = 0.16 + i * 0.05;
      const amp = 16 + i * 9;
      const dx = (reduced ? 0 : Math.sin(t * sp + i * 2.1) * amp) + ptr.x * (12 + i * 7);
      const dy = (reduced ? 0 : Math.cos(t * sp * 1.3 + i) * amp * 0.7) + ptr.y * (9 + i * 5);
      const s = 1 + between * 0.07 * (i % 2 ? 1 : -1);
      b.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${((reduced ? 0 : t * (4 + i)) % 360).toFixed(2)}deg) scale(${s.toFixed(4)})`;
    });

    // sprinkles: gentle tumble, and a scatter kick through the change
    sprinkles.forEach((s, i) => {
      const ph = i * 0.9;
      const dx = (reduced ? 0 : Math.sin(t * 0.5 + ph) * 10) + ptr.x * 18 * ((i % 3) - 1) * 0.5;
      const dy = (reduced ? 0 : Math.cos(t * 0.45 + ph) * 12) - between * 16 * (1 + (i % 3));
      s.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${(i * 37 + (reduced ? 0 : t * 12 * (i % 2 ? 1 : -1))).toFixed(1)}deg) scale(${(1 + between * 0.25).toFixed(3)})`;
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
