"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { formatINR, useCart, type PlacedOrder } from "@/lib/cart";
import "./order.css";

const EASE = [0.16, 1, 0.3, 1] as const;

function Stepper({ qty, onChange }: { qty: number; onChange: (n: number) => void }) {
  return (
    <div className="line__qty">
      <button type="button" onClick={() => onChange(qty - 1)} aria-label="One fewer">−</button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={() => onChange(qty + 1)} aria-label="One more">+</button>
    </div>
  );
}

/** The bag: what you added, and the short form that turns it into an order. */
export default function OrderDesk() {
  const { lines, total, count, setQty, remove, clear, place, orders } = useCart();
  const [done, setDone] = useState<PlacedOrder | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", method: "pickup" as "pickup" | "table", note: "" });
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("We need a name and a number so we can call you when it is ready.");
      return;
    }
    setError("");
    const placed = place({ name: form.name.trim(), phone: form.phone.trim(), method: form.method, note: form.note.trim() });
    if (placed) setDone(placed);
  };

  if (done) {
    return (
      <section className="order order--done" aria-labelledby="order-title">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <p className="order__kicker"><i aria-hidden="true" /> Order placed</p>
          <h1 id="order-title" className="order__title">
            <span className="serif">Thank you,</span>
            <span>{done.name.split(" ")[0]}.</span>
          </h1>
          <p className="order__lede">
            Your order is <b>{done.ref}</b>. We are making it now, and we will call {done.phone} when it is ready
            {done.method === "table" ? " and bring it to your table" : " to collect at the counter"}.
          </p>
          <ul className="order__receipt">
            {done.lines.map((l) => (
              <li key={l.id}>
                <span>{l.qty} × {l.name}</span>
                <span>{formatINR(l.price * l.qty)}</span>
              </li>
            ))}
            <li className="order__receipt-total">
              <span>Paid at the counter</span>
              <span>{formatINR(done.total)}</span>
            </li>
          </ul>
          <div className="order__actions">
            <Link className="btn btn--wine" href="/coffee">
              Order something else
              <span className="btn__dot">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 13 13 3M5.5 3H13v7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
            <Link className="btn btn--ghost" href="/">Back home</Link>
          </div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="order" aria-labelledby="order-title">
      <p className="order__kicker"><i aria-hidden="true" /> Your bag</p>
      <h1 id="order-title" className="order__title">
        <span className="serif">What you are</span>
        <span>taking home.</span>
      </h1>

      {count === 0 ? (
        <div className="order__empty">
          <p>Nothing in the bag yet.</p>
          <div className="order__actions">
            <Link className="btn btn--wine" href="/coffee">
              See the coffee
              <span className="btn__dot">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 13 13 3M5.5 3H13v7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
            <Link className="btn btn--ghost" href="/ice-cream">Ice cream</Link>
            <Link className="btn btn--ghost" href="/pastries">Pastries</Link>
          </div>
        </div>
      ) : (
        <div className="order__grid">
          <ul className="order__lines">
            <AnimatePresence initial={false}>
              {lines.map((l) => (
                <motion.li
                  key={l.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail */}
                  <img src={l.img} alt="" />
                  <div className="line__text">
                    <b>{l.name}</b>
                    <small>{formatINR(l.price)} each</small>
                  </div>
                  <Stepper qty={l.qty} onChange={(n) => setQty(l.id, n)} />
                  <span className="line__sum">{formatINR(l.price * l.qty)}</span>
                  <button type="button" className="line__remove" onClick={() => remove(l.id)} aria-label={`Remove ${l.name}`}>
                    ×
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
            <li className="order__clear">
              <button type="button" onClick={clear}>Empty the bag</button>
            </li>
          </ul>

          <form className="order__form" onSubmit={submit} noValidate>
            <div className="order__total">
              <span>Total</span>
              <b>{formatINR(total)}</b>
            </div>

            <label className="field">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="name"
                required
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </label>

            <fieldset className="field field--choice">
              <legend>How</legend>
              <label>
                <input
                  type="radio"
                  name="method"
                  checked={form.method === "pickup"}
                  onChange={() => setForm({ ...form, method: "pickup" })}
                />
                <span>Collect at the counter</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="method"
                  checked={form.method === "table"}
                  onChange={() => setForm({ ...form, method: "table" })}
                />
                <span>Bring it to my table</span>
              </label>
            </fieldset>

            <label className="field">
              <span>Anything else</span>
              <textarea
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Oat milk, less ice…"
              />
            </label>

            {error && <p className="order__error" role="alert">{error}</p>}

            <motion.button type="submit" className="btn btn--wine order__place" whileTap={{ scale: 0.97 }}>
              Place the order
              <span className="btn__dot">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </motion.button>
            <p className="order__small">You pay at the counter when you collect. Nothing is charged here.</p>
          </form>
        </div>
      )}

      {orders.length > 0 && (
        <section className="order__past" aria-labelledby="past-title">
          <h2 id="past-title">Earlier orders</h2>
          <ul>
            {orders.map((o) => (
              <li key={o.ref}>
                <b>{o.ref}</b>
                <span>{new Date(o.placedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                <span>{o.lines.reduce((s, l) => s + l.qty, 0)} items</span>
                <span>{formatINR(o.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
