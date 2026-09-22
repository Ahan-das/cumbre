/**
 * The bag, as a plain store: no framework, so the React app and the static
 * preview share exactly the same behaviour. Persists to localStorage, which
 * can throw (private windows, blocked storage), so every access is guarded.
 */
export type CartLine = {
  id: string;
  name: string;
  price: number; // rupees
  img: string;
  qty: number;
};

export type PlacedOrder = {
  ref: string;
  placedAt: string;
  name: string;
  phone: string;
  method: "pickup" | "table";
  note: string;
  lines: CartLine[];
  total: number;
};

export type CartState = { lines: CartLine[]; orders: PlacedOrder[] };

const CART_KEY = "cumbre.cart.v1";
const ORDERS_KEY = "cumbre.orders.v1";

/** "₹240" -> 240 */
export const toAmount = (price: string) => Number(String(price).replace(/[^\d.]/g, "")) || 0;
export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/**
 * One frozen empty snapshot, shared by the server render and the first client
 * render. It must be the same object every time: useSyncExternalStore compares
 * snapshots by identity, and a fresh `{ lines: [], orders: [] }` per call makes
 * React re-render forever.
 */
const EMPTY: CartState = { lines: [], orders: [] };

let state: CartState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((fn) => fn());

function set(next: CartState, persist = true) {
  state = next;
  if (persist && typeof window !== "undefined") {
    write(CART_KEY, state.lines);
    write(ORDERS_KEY, state.orders);
  }
  emit();
}

/** Call once on the client. Safe to call repeatedly. */
export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  set({ lines: read<CartLine[]>(CART_KEY, []), orders: read<PlacedOrder[]>(ORDERS_KEY, []) }, false);
  // another tab changed the bag
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY || e.key === ORDERS_KEY) {
      set({ lines: read<CartLine[]>(CART_KEY, []), orders: read<PlacedOrder[]>(ORDERS_KEY, []) }, false);
    }
  });
}

export const getState = () => state;
/** Server render: an empty bag, so the first paint matches. Cached on purpose. */
export const getServerState = (): CartState => EMPTY;

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function add(item: Omit<CartLine, "qty">, qty = 1) {
  const at = state.lines.findIndex((l) => l.id === item.id);
  const lines = [...state.lines];
  if (at < 0) lines.push({ ...item, qty });
  else lines[at] = { ...lines[at], qty: lines[at].qty + qty };
  set({ ...state, lines });
}

export function setQty(id: string, qty: number) {
  const lines = qty <= 0 ? state.lines.filter((l) => l.id !== id) : state.lines.map((l) => (l.id === id ? { ...l, qty } : l));
  set({ ...state, lines });
}

export const remove = (id: string) => set({ ...state, lines: state.lines.filter((l) => l.id !== id) });
export const clear = () => set({ ...state, lines: [] });

export const totalOf = (lines: CartLine[]) => lines.reduce((s, l) => s + l.price * l.qty, 0);
export const countOf = (lines: CartLine[]) => lines.reduce((s, l) => s + l.qty, 0);

export function place(details: Omit<PlacedOrder, "ref" | "placedAt" | "lines" | "total">): PlacedOrder | null {
  if (state.lines.length === 0) return null;
  const order: PlacedOrder = {
    ...details,
    ref: `CB-${Math.random().toString(36).slice(2, 6).toUpperCase()}${String(Date.now()).slice(-3)}`,
    placedAt: new Date().toISOString(),
    lines: state.lines,
    total: totalOf(state.lines),
  };
  set({ lines: [], orders: [order, ...state.orders].slice(0, 20) });
  return order;
}
