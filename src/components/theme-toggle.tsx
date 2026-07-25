"use client";

import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "englishjieyou.theme";
const defaultTheme: ThemeMode = "night";

type ThemeMode = "day" | "night";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "night" ? "dark" : "light";
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return defaultTheme;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "day" || storedTheme === "night") {
    return storedTheme;
  }

  return defaultTheme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(defaultTheme);

  useEffect(() => {
    const storedTheme = readStoredTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  function chooseTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div className="theme-toggle" aria-label="主题切换">
      <button
        aria-pressed={theme === "day"}
        className={theme === "day" ? "active" : ""}
        onClick={() => chooseTheme("day")}
        type="button"
      >
        白天
      </button>
      <button
        aria-pressed={theme === "night"}
        className={theme === "night" ? "active" : ""}
        onClick={() => chooseTheme("night")}
        type="button"
      >
        夜晚
      </button>
    </div>
  );
}

