"use client";

import Link from "next/link";
import { openMenu } from "@/lib/menuRegistry";
import { useCart } from "@/lib/cart";
import "./site.css";

/**
 * The bar at the top of every page: brand mark, the two standing links, the
 * Menu button (which opens the searchable menu) and the order pill.
 * It sits over the page art and scrolls away with it; the floating Menu pill
 * takes over after that.
 */
export default function SiteHeader({ current }: { current?: "home" | "visit" }) {
  const { count } = useCart();
  return (
    <nav className="nav" aria-label="Primary">
      <ul>
        <li>
          <Link className="nav__link" href="/" aria-current={current === "home" ? "page" : undefined}>
            Home
          </Link>
        </li>
        <li>
          <Link className="nav__link" href="/#visit" aria-current={current === "visit" ? "page" : undefined}>
            Visit
          </Link>
        </li>
      </ul>
      <Link className="logo" href="/" aria-label="Cumbre, home">
        <span>
          CUM<br />BRE
          <small>CAFÉ</small>
        </span>
      </Link>
      <ul>
        <li className="nav__menu-item">
          <button type="button" className="nav__link" onClick={openMenu} aria-haspopup="dialog">
            Menu
          </button>
        </li>
        <li>
          <Link className="nav__cart" href="/order" data-full={count > 0 ? "true" : undefined}>
            Order <em aria-label={`${count} ${count === 1 ? "item" : "items"} in the bag`}>{count}</em>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
