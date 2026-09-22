import Link from "next/link";
import "./site.css";

const MENU = [
  { href: "/order", label: "Your order" },
  { href: "/coffee", label: "Coffee" },
  { href: "/ice-cream", label: "Ice cream" },
  { href: "/pastries", label: "Pastries" },
];

const VISIT = [
  { label: "14 Prinsep Lane, Kolkata 700072" },
  { label: "Every day, 7 am until late" },
  { label: "hello@cumbre.coffee", href: "mailto:hello@cumbre.coffee" },
  { label: "+91 33 4000 1180", href: "tel:+913340001180" },
];

export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="foot__top">
        <p className="foot__mark" aria-hidden="true">Cumbre</p>
        <p className="foot__line">
          Roasted in small batches, poured the same week. Come for the coffee, stay for whatever just came out of the oven.
        </p>
      </div>

      <div className="foot__cols">
        <section>
          <h2>Menu</h2>
          <ul>
            {MENU.map((m) => (
              <li key={m.href}>
                <Link href={m.href}>{m.label}</Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Visit</h2>
          <ul>
            {VISIT.map((v) => (
              <li key={v.label}>{v.href ? <a href={v.href}>{v.label}</a> : v.label}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Follow</h2>
          <ul>
            <li><a href="https://instagram.com" rel="noreferrer noopener">Instagram</a></li>
            <li><a href="https://wa.me/913340001180" rel="noreferrer noopener">WhatsApp</a></li>
          </ul>
        </section>
        <section className="foot__sub">
          <h2>Roast notes</h2>
          <p>One letter a month: what we are roasting, what is on the pastry shelf.</p>
          <form className="foot__form" action="/#order">
            <label className="sr-only" htmlFor="foot-email">Email address</label>
            <input id="foot-email" name="email" type="email" placeholder="you@email.com" required />
            <button type="submit">Join</button>
          </form>
        </section>
      </div>

      <div className="foot__legal">
        <span>© {new Date().getFullYear()} Cumbre Café</span>
        <span>Kolkata</span>
      </div>
    </footer>
  );
}
