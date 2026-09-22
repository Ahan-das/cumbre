"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import * as store from "./cartStore";

export type { CartLine, PlacedOrder } from "./cartStore";
export { toAmount, formatINR } from "./cartStore";

/** React view of the bag. The store itself is framework-free (cartStore.ts). */
export function useCart() {
  useEffect(() => store.hydrate(), []);
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getServerState);
  return useMemo(
    () => ({
      lines: state.lines,
      orders: state.orders,
      count: store.countOf(state.lines),
      total: store.totalOf(state.lines),
      add: store.add,
      setQty: store.setQty,
      remove: store.remove,
      clear: store.clear,
      place: store.place,
    }),
    [state],
  );
}

/** Kept so the tree has one obvious place to start the store. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => store.hydrate(), []);
  return <>{children}</>;
}
