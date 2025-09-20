"use client"

import { useState, useEffect } from "react"

type Theme = "day" | "afternoon" | "night"

export const futuristicThemes = {
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
}

export function useThemeByTime() {
  const [themeByTime, setThemeByTime] = useState<Theme>("night")

  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours()

      if (hour >= 6 && hour < 12) {
        setThemeByTime("day")
      } else if (hour >= 12 && hour < 18) {
        setThemeByTime("afternoon")
      } else {
        setThemeByTime("night")
      }
    }

    updateTheme()
    const interval = setInterval(updateTheme, 60000)
    return () => clearInterval(interval)
  }, [])

  return {
    theme: themeByTime,
    colors: futuristicThemes[themeByTime],
  }
}
