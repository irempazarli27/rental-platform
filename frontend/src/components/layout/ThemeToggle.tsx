"use client";

import { Moon, Sun } from "lucide-react";

// The current theme lives on <html data-theme>, set before first paint by the
// inline script in the root layout. Both icons are rendered and CSS picks one,
// so the button needs no state and can't mismatch during hydration.
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage unavailable (private mode) — the choice just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full p-2.5 text-stone-600 hover:bg-stone-100"
      aria-label="Açık / koyu tema"
      title="Açık / koyu tema"
    >
      <Moon className="h-5 w-5 dark:hidden" strokeWidth={1.75} />
      <Sun className="hidden h-5 w-5 dark:block" strokeWidth={1.75} />
    </button>
  );
}
