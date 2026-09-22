/**
 * Lets the header's menu button jump to any item in any chapter.
 * Each chapter registers its goTo when it mounts; the button calls jumpTo.
 */
export type ChapterId = "coffee" | "ice-cream" | "pastries";

const chapters = new Map<string, (index: number, dur?: number) => void>();

export function registerChapter(id: ChapterId, go: (index: number, dur?: number) => void) {
  chapters.set(id, go);
  return () => {
    if (chapters.get(id) === go) chapters.delete(id);
  };
}

/** Scroll to `index` of the chapter, wherever we are on the page. */
export function jumpTo(id: ChapterId, index: number) {
  const go = chapters.get(id);
  if (go) {
    // goTo works in document coordinates, so it is safe from anywhere on the page
    go(index, 1100);
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export const MENU_EVENT = "cumbre:menu";
/** Anything on the page can ask for the menu: window.dispatchEvent(new Event(MENU_EVENT)) */
export function openMenu() {
  window.dispatchEvent(new Event(MENU_EVENT));
}
