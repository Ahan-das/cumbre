/**
 * One rAF loop for the whole hero. Framework-agnostic on purpose: the React
 * component hands it DOM refs, and it owns every per-frame write.
 *
 *  - pointer: eased, drives parallax on every plane and turns the cup
 *  - scroll:  0..1 across the sticky travel, eased, drives the hand-off
 *  - beans:   parallax by depth, spread on scroll, and a springy repel from
 *             the cursor (the signature move: the beans get out of your way)
 *  - cup:     spring drop-in on load, idle sway, steam
 *
 * Pauses when the hero is off-screen or the tab is hidden.
 */
import { CupRenderer, type CupPose } from "@/lib/webgl/cupRenderer";

export type HeroRefs = {
  root: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  word: HTMLElement;
  disc: HTMLElement;
  shadow: HTMLElement;
  copy: HTMLElement;
  aside: HTMLElement | null;
  meta: HTMLElement | null;
  beans: HTMLElement[];
};

type BeanState = {
  el: HTMLElement;
  d: number;
  rot: number;
  phase: number;
  // spring state for the repel offset
  ox: number; oy: number; vx: number; vy: number;
  cx: number; cy: number; // resting centre in stage px
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Critically-under-damped spring step response, 0 -> 1 with a small overshoot. */
function springStep(t: number, stiffness = 90, damping = 11) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness);
  const zeta = damping / (2 * w0);
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
}

export function startHero(refs: HeroRefs, opts: { modelUrl: string | ArrayBuffer; reduced: boolean; onWebglFail?: () => void }) {
  const { root, stage, canvas, word, disc, shadow, copy, aside, meta } = refs;
  const reduced = opts.reduced;
  let renderer: CupRenderer | null = null;
  let disposed = false;
  let visible = true;
  let raf = 0;
  let loadedAt = -1;
  const t0 = performance.now();
  let last = t0;

  const beans: BeanState[] = refs.beans.map((el, i) => ({
    el,
    d: Number(el.dataset.d ?? 0),
    rot: Number(el.dataset.rot ?? 0),
    phase: i * 1.7,
    ox: 0, oy: 0, vx: 0, vy: 0, cx: 0, cy: 0,
  }));

  // pointer (normalised -1..1) and raw px
  const ptr = { tx: 0, ty: 0, x: 0, y: 0, px: -9999, py: -9999, inside: false };
  let prog = 0;
  let progTarget = 0;
  let W = 1, H = 1, isPhone = false;
  const fine = window.matchMedia("(pointer: fine)").matches;

  const measure = () => {
    const r = stage.getBoundingClientRect();
    W = r.width;
    H = r.height;
    isPhone = W <= 720;
    // resting centres, measured with the loop's transforms removed
    for (const b of beans) {
      const prev = b.el.style.transform;
      b.el.style.transform = "none";
      const br = b.el.getBoundingClientRect();
      b.cx = br.left - r.left + br.width / 2;
      b.cy = br.top - r.top + br.height / 2;
      b.el.style.transform = prev;
    }
    renderer?.resize(isPhone ? 2 : 1.75);
  };

  const readScroll = () => {
    const r = root.getBoundingClientRect();
    const travel = Math.max(1, r.height - window.innerHeight);
    progTarget = clamp(-r.top / travel);
  };

  const onPointer = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    ptr.px = e.clientX - r.left;
    ptr.py = e.clientY - r.top;
    ptr.tx = (ptr.px / r.width) * 2 - 1;
    ptr.ty = (ptr.py / r.height) * 2 - 1;
    ptr.inside = true;
  };
  const onLeave = () => {
    ptr.tx = 0;
    ptr.ty = 0;
    ptr.inside = false;
    ptr.px = ptr.py = -9999;
  };

  // --- WebGL ---
  try {
    renderer = new CupRenderer(canvas);
    renderer
      .load(opts.modelUrl)
      .then(() => {
        if (disposed) return;
        measure();
        loadedAt = performance.now();
        canvas.dataset.ready = "true";
      })
      .catch((err) => {
        console.warn("[hero] cup failed to load", err);
        opts.onWebglFail?.();
      });
  } catch (err) {
    console.warn("[hero] WebGL2 unavailable", err);
    renderer = null;
    opts.onWebglFail?.();
  }

  const pose: CupPose = { yaw: 0, pitch: 0, roll: 0, scale: 0.86, x: 0, y: 0, steam: 1, fade: 0 };

  const frame = (now: number) => {
    raf = 0;
    if (disposed) return;
    const t = (now - t0) / 1000;
    // real frame time, so easing feels the same at 30, 60 or 120 Hz
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const ease = (rate: number) => (reduced ? 1 : 1 - Math.exp(-rate * dt));

    ptr.x = lerp(ptr.x, ptr.tx, ease(3.6));
    ptr.y = lerp(ptr.y, ptr.ty, ease(3.6));
    prog = lerp(prog, progTarget, ease(7));
    const p = prog;
    const mx = reduced ? 0 : ptr.x;
    const my = reduced ? 0 : ptr.y;

    // ---- DOM planes ----
    const exit = isPhone ? smooth(0.02, 0.35, p) : smooth(0.05, 0.6, p);
    word.style.transform = `translate3d(${(-p * 22 - mx * 0.8).toFixed(3)}vw, ${(-my * 6 + p * 40).toFixed(2)}px, 0)`;
    disc.style.transform = `translate3d(${(mx * -10).toFixed(2)}px, ${(my * -8 - p * 30).toFixed(2)}px, 0) scale(${(1 + p * 0.5).toFixed(4)})`;
    copy.style.transform = `translate3d(${(mx * 6).toFixed(2)}px, ${(-exit * (isPhone ? 36 : 90) + my * 4).toFixed(2)}px, 0)`;
    copy.style.opacity = (1 - exit).toFixed(3);
    copy.style.visibility = exit > 0.99 ? "hidden" : "visible";
    if (aside) {
      aside.style.transform = `translate3d(${(mx * 8 + exit * 60).toFixed(2)}px, ${(my * 4).toFixed(2)}px, 0)`;
      aside.style.opacity = (1 - exit).toFixed(3);
    }
    if (meta) meta.style.opacity = (1 - exit).toFixed(3);

    // ---- cup ----
    const since = loadedAt < 0 ? -1 : (now - loadedAt) / 1000;
    const drop = reduced ? 1 : springStep(since, 70, 9.5);
    const idle = reduced ? 0 : Math.sin(t * 0.6) * 0.18;
    const baseScale = isPhone ? 0.5 : 0.78;
    const baseY = isPhone ? -0.2 : -0.05;
    pose.fade = since < 0 ? 0 : reduced ? 1 : clamp(since / 0.35);
    pose.yaw = -0.18 + idle + mx * 0.45 + p * 2.4 + (1 - drop) * -1.6;
    pose.pitch = -my * 0.1 + p * 0.28;
    pose.roll = -mx * 0.05 + (1 - drop) * 0.25 - p * 0.08;
    pose.scale = baseScale * (1 + p * (isPhone ? 0.14 : 0.24));
    pose.x = isPhone ? 0 : mx * -0.01;
    pose.y = baseY + (1 - drop) * 0.9 - p * (isPhone ? 0.02 : 0.05) + (reduced ? 0 : Math.sin(t * 1.1) * 0.006);
    pose.steam = (1 - smooth(0.1, 0.5, p)) * clamp(since - 0.6);
    renderer?.render(pose, t);

    const lift = (pose.y - baseY) / 0.9; // 0 when seated
    if (renderer?.ready) {
      // a soft ellipse pinned under the projected base; shrinks and fades while the cup is airborne
      const air = clamp(lift);
      const w = renderer.base.r * 2.9 * (1 - air * 0.45);
      const h = w * 0.16;
      shadow.style.opacity = (pose.fade * (1 - clamp(air * 2.2)) * (1 - smooth(0, 0.7, p))).toFixed(3);
      shadow.style.transform = `translate3d(${(renderer.base.x - w / 2).toFixed(1)}px, ${(renderer.base.y - h * 0.35 + air * 40).toFixed(1)}px, 0) scale(${w.toFixed(1)}, ${h.toFixed(1)})`;
    }

    // ---- beans ----
    const repelR = Math.min(W, H) * 0.2;
    for (const b of beans) {
      const depth = b.d;
      const par = isPhone ? 0.5 : 1;
      const px = mx * depth * 34 * par;
      const py = my * depth * 22 * par;
      const float = reduced ? 0 : Math.sin(t * 0.9 + b.phase) * 5 * (0.5 + Math.abs(depth));

      // spread away from the cup as the hero hands off; front beans rush past the lens
      const dirX = b.cx - W / 2;
      const dirY = b.cy - H * 0.55;
      const spread = p * (0.35 + Math.max(0, depth) * 0.9);
      const sx = dirX * spread;
      const sy = dirY * spread - p * depth * 220;

      // springy repel
      let fx = 0, fy = 0;
      if (fine && ptr.inside && !reduced) {
        const bx = b.cx + px + sx + b.ox;
        const by = b.cy + py + sy + b.oy;
        const dx = bx - ptr.px;
        const dy = by - ptr.py;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < repelR) {
          const k = (1 - dist / repelR) ** 2 * 90;
          fx = (dx / dist) * k;
          fy = (dy / dist) * k;
        }
      }
      // spring toward target offset (fx, fy): stiff enough to feel physical, loose enough to wobble.
      // semi-implicit Euler in fixed substeps keeps it stable on slow frames
      const steps = Math.ceil(dt / (1 / 120));
      const h = dt / steps;
      for (let k = 0; k < steps; k++) {
        b.vx += ((fx - b.ox) * 120 - b.vx * 11) * h;
        b.vy += ((fy - b.oy) * 120 - b.vy * 11) * h;
        b.ox += b.vx * h;
        b.oy += b.vy * h;
      }

      const rot = b.rot + (reduced ? 0 : Math.sin(t * 0.5 + b.phase) * 8) + p * 160 * Math.sign(depth || 1) + b.vx * 0.12;
      const scale = 1 + p * Math.max(0, depth) * 0.9;
      b.el.style.transform = `translate3d(${(px + sx + b.ox).toFixed(2)}px, ${(py + sy + float + b.oy).toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    }

    if (visible && !reduced) raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    if (raf || disposed) return;
    if (reduced) last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const resume = () => {
    // avoid a giant dt after a pause
    last = performance.now();
    kick();
  };

  // reduced motion still needs a frame per state change (load, scroll, resize)
  const onScroll = () => {
    readScroll();
    kick();
  };
  const onResize = () => {
    measure();
    readScroll();
    kick();
  };

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && document.visibilityState === "visible";
    if (visible) resume();
  });
  io.observe(root);
  const onVis = () => {
    visible = document.visibilityState === "visible";
    if (visible) resume();
  };

  const ro = new ResizeObserver(onResize);
  ro.observe(stage);
  window.addEventListener("scroll", onScroll, { passive: true });
  stage.addEventListener("pointermove", onPointer, { passive: true });
  stage.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVis);

  measure();
  readScroll();
  kick();
  // reduced motion: render once more when the model lands
  const readyPoll = window.setInterval(() => {
    if (loadedAt >= 0) {
      window.clearInterval(readyPoll);
      kick();
    }
  }, 120);

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    window.clearInterval(readyPoll);
    io.disconnect();
    ro.disconnect();
    window.removeEventListener("scroll", onScroll);
    stage.removeEventListener("pointermove", onPointer);
    stage.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("visibilitychange", onVis);
    renderer?.dispose();
  };
}
