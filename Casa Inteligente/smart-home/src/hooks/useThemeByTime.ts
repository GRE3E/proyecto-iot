"use client"
import { useState, useEffect, useCallback } from "react"
import "../styles/animations.css"
export type ThemeMode = "dark" | "light"

const themes: Record<ThemeMode, Record<string, string>> = {
  dark: {
    primary: "from-indigo-500 to-cyan-500",
    secondary: "from-fuchsia-500 to-violet-500",
    accent: "from-cyan-500 to-indigo-600",
    background: "bg-gradient-to-br from-slate-950 via-slate-900 to-black",
    cardBg: "bg-slate-900/60 border-slate-700/50",
    cardHover: "hover:bg-slate-800/60 hover:border-slate-500/50 hover:shadow-indigo-500/20",
    text: "text-white",
    mutedText: "text-slate-400",
    border: "border-slate-700/50",
    chipBg: "bg-slate-800/60 border-slate-600/40",
    chipText: "text-slate-200",
    inputBg: "bg-slate-800",
    inputBorder: "border-slate-700",
    icon: "text-white",
    headerBg: "bg-black/20 border-white/10",
    title: "text-white",
    successChip: "bg-emerald-900/30 text-emerald-300 border border-emerald-400/30",
    dangerChip: "bg-rose-900/30 text-rose-300 border border-rose-400/30",
    warningChip: "bg-amber-900/30 text-amber-300 border border-amber-400/30",
    glow: "shadow-indigo-500/30",
  },
  light: {
    primary: "from-blue-500 to-cyan-500",
    secondary: "from-violet-500 to-pink-500",
    accent: "from-blue-400 to-cyan-400",
    background: "bg-white",
    cardBg: "bg-white border-slate-200",
    cardHover: "hover:bg-slate-50 hover:border-slate-300 hover:shadow-blue-300/20",
    text: "text-slate-900",
    mutedText: "text-slate-500",
    border: "border-slate-300",
    chipBg: "bg-slate-100 border-slate-300",
    chipText: "text-slate-900",
    inputBg: "bg-white",
    inputBorder: "border-slate-300",
    icon: "text-slate-800",
    headerBg: "bg-white/60 border-slate-200",
    title: "text-slate-900",
    successChip: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dangerChip: "bg-rose-50 text-rose-700 border border-rose-200",
    warningChip: "bg-amber-50 text-amber-700 border border-amber-200",
    glow: "shadow-indigo-300/30",
  },
}

export function useThemeByTime() {
  const getInitial = (): ThemeMode => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme_mode")
      if (stored === "light" || stored === "dark") return stored as ThemeMode
      localStorage.setItem("theme_mode", "light")
      return "light"
    }
    return "light"
  }

  const subscribers: Set<(mode: ThemeMode) => void> = (globalThis as any).__themeSubscribers || new Set()
  ;(globalThis as any).__themeSubscribers = subscribers

  const globalThemeKey = "__globalThemeMode"
  const initialGlobal: ThemeMode = (globalThis as any)[globalThemeKey] ?? getInitial()
  ;(globalThis as any)[globalThemeKey] = initialGlobal

  const [themeMode, setThemeMode] = useState<ThemeMode>(initialGlobal)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const handler = (mode: ThemeMode) => setThemeMode(mode)
    subscribers.add(handler)
    return () => {
      subscribers.delete(handler)
    }
  }, [subscribers])

  const setTheme = useCallback((mode: ThemeMode) => {
    setIsTransitioning(true)
    setThemeMode(mode)
    ;(globalThis as any)[globalThemeKey] = mode
    if (typeof window !== "undefined") localStorage.setItem("theme_mode", mode)
    subscribers.forEach((fn) => fn(mode))
    setTimeout(() => setIsTransitioning(false), 300)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(themeMode === "dark" ? "light" : "dark")
  }, [themeMode, setTheme])

  return {
    theme: themeMode,
    colors: themes[themeMode],
    isTransitioning,
    transitionClass: isTransitioning ? "theme-transition" : "",
    setTheme,
    toggleTheme,
  }
}