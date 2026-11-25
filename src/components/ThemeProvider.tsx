"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "midnight" | "emerald";
export type NavLayout = "executive-2row" | "classic-3row" | "ultra-compact";

interface ThemeContextType {
  theme: Theme;
  navLayout: NavLayout;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setNavLayout: (layout: NavLayout) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  navLayout: "executive-2row",
  toggleTheme: () => {},
  setTheme: () => {},
  setNavLayout: () => {},
});

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark", "midnight", "emerald");
  
  if (t === "light") {
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
  } else if (t === "midnight") {
    root.classList.add("dark", "midnight");
    root.setAttribute("data-theme", "midnight");
  } else if (t === "emerald") {
    root.classList.add("dark", "emerald");
    root.setAttribute("data-theme", "emerald");
  } else {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [navLayout, setNavLayoutState] = useState<NavLayout>("executive-2row");

  useEffect(() => {
    const savedTheme = localStorage.getItem("sielab_reach_theme") as Theme | null;
    if (savedTheme && ["light", "dark", "midnight", "emerald"].includes(savedTheme)) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("dark");
    }

    const savedNavLayout = localStorage.getItem("sielab_reach_nav_layout") as NavLayout | null;
    if (savedNavLayout && ["executive-2row", "classic-3row", "ultra-compact"].includes(savedNavLayout)) {
      setNavLayoutState(savedNavLayout);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("sielab_reach_theme", newTheme);
    applyTheme(newTheme);
  };

  const setNavLayout = (layout: NavLayout) => {
    setNavLayoutState(layout);
    localStorage.setItem("sielab_reach_nav_layout", layout);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, navLayout, toggleTheme, setTheme, setNavLayout }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
