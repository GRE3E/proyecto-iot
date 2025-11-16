"use client"
import { useState, useEffect, useCallback } from "react"
import "../styles/animations.css"
export type ThemeMode = "dawn" | "day" | "midday" | "afternoon" | "night" | "midnight"

export const futuristicThemes: Record<ThemeMode, Record<string, string>> = {
  dawn: {
    primary: "from-sky-300 to-blue-400",
    secondary: "from-cyan-300 to-sky-400",
    accent: "from-blue-300 to-cyan-400",
    background: "from-slate-900 via-sky-950 to-slate-900",
    cardBg: "bg-sky-950/30 border-sky-400/30",
    cardHover: "hover:bg-sky-900/40 hover:border-sky-300/50 hover:shadow-sky-300/30",
    text: "text-sky-100",
    glow: "shadow-sky-300/40",
  },
  day: {
    primary: "from-cyan-400 to-blue-500",
    secondary: "from-emerald-400 to-teal-500",
    accent: "from-violet-400 to-purple-500",
    background: "from-slate-900 via-cyan-950 to-slate-900",
    cardBg: "bg-cyan-950/20 border-cyan-400/30",
    cardHover: "hover:bg-cyan-900/30 hover:border-cyan-300/50 hover:shadow-cyan-400/20",
    text: "text-cyan-100",
    glow: "shadow-cyan-400/25",
  },
  midday: {
    primary: "from-yellow-300 to-amber-400",
    secondary: "from-amber-400 to-yellow-500",
    accent: "from-lime-400 to-yellow-400",
    background: "from-slate-900 via-yellow-950/80 to-slate-900",
    cardBg: "bg-yellow-950/30 border-yellow-400/40",
    cardHover: "hover:bg-yellow-900/40 hover:border-yellow-300/60 hover:shadow-yellow-400/40",
    text: "text-yellow-100",
    glow: "shadow-yellow-300/50",
  },
  afternoon: {
    primary: "from-orange-400 to-red-500",
    secondary: "from-pink-400 to-rose-500",
    accent: "from-amber-400 to-yellow-500",
    background: "from-slate-900 via-orange-950 to-slate-900",
    cardBg: "bg-orange-950/20 border-orange-400/30",
    cardHover: "hover:bg-orange-900/30 hover:border-orange-300/50 hover:shadow-orange-400/20",
    text: "text-orange-100",
    glow: "shadow-orange-400/25",
  },
  night: {
    primary: "from-purple-400 to-indigo-500",
    secondary: "from-violet-400 to-purple-500",
    accent: "from-cyan-400 to-blue-500",
    background: "from-slate-900 via-purple-950 to-slate-900",
    cardBg: "bg-purple-950/20 border-purple-400/30",
    cardHover: "hover:bg-purple-900/30 hover:border-purple-300/50 hover:shadow-purple-400/20",
    text: "text-purple-100",
    glow: "shadow-purple-400/25",
  },
  midnight: {
    primary: "from-emerald-500 to-teal-600",
    secondary: "from-teal-600 to-emerald-700",
    accent: "from-cyan-500 to-emerald-400",
    background: "from-black via-emerald-950 to-black",
    cardBg: "bg-emerald-950/50 border-emerald-500/30",
    cardHover: "hover:bg-emerald-900/60 hover:border-emerald-400/50 hover:shadow-emerald-500/40",
    text: "text-emerald-50",
    glow: "shadow-emerald-400/60",
  },
}

export function useThemeByTime() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("night")
  const [isTransitioning, setIsTransitioning] = useState(false)

  const calculateTheme = useCallback((): ThemeMode => {
    const hour = new Date().getHours()
    if (hour >= 4 && hour < 6) return "dawn"
    if (hour >= 6 && hour < 12) return "day"
    if (hour >= 12 && hour < 14) return "midday"
    if (hour >= 14 && hour < 18) return "afternoon"
    if (hour >= 18 && hour < 22) return "night"
    return "midnight"
  }, [])

  useEffect(() => {
    const initialTheme = calculateTheme()
    setThemeMode(initialTheme)

    const interval = setInterval(() => {
      const newTheme = calculateTheme()
      if (newTheme !== themeMode) {
        setIsTransitioning(true)

        const timer = setTimeout(() => {
          setThemeMode(newTheme)
          setTimeout(() => setIsTransitioning(false), 900)
        }, 50)

        return () => clearTimeout(timer)
      }
    }, 60_000)

    return () => clearInterval(interval)
  }, [calculateTheme, themeMode])

  return {
    theme: themeMode,
    colors: futuristicThemes[themeMode],
    isTransitioning,
    transitionClass: isTransitioning ? "theme-transition" : "",
  }
}