//Cambia de color dependiendo de la hora del día
"use client"
import { useState, useEffect, useCallback } from "react"

/**
 * Tipo de tema disponible.
 */
export type ThemeMode = "day" | "afternoon" | "night"

/**
 * Paleta de colores futurista basada en el momento del día.
 * Optimizada para UX/UI con contraste, consistencia y feedback visual.
 */
export const futuristicThemes: Record<ThemeMode, Record<string, string>> = {
  day: {
    primary: "from-cyan-400 to-blue-500 transition-colors duration-50 ease-in-out",
    secondary: "from-emerald-400 to-teal-500 transition-colors duration-50 ease-in-out",
    accent: "from-violet-400 to-purple-500 transition-colors duration-50 ease-in-out",
    background: "from-slate-900 via-cyan-950 to-slate-900 transition-colors duration-50 ease-in-out",
    cardBg: "bg-cyan-950/20 border-cyan-400/30 transition-colors duration-50 ease-in-out",
    cardHover: "hover:bg-cyan-900/30 hover:border-cyan-300/50 hover:shadow-cyan-400/20 transition-colors duration-50 ease-in-out",
    text: "text-cyan-100 transition-colors duration-50 ease-in-out",
    glow: "shadow-cyan-400/25 transition-shadow duration-50 ease-in-out",
  },
  afternoon: {
    primary: "from-orange-400 to-red-500 transition-colors duration-50 ease-in-out",
    secondary: "from-pink-400 to-rose-500 transition-colors duration-50 ease-in-out",
    accent: "from-amber-400 to-yellow-500 transition-colors duration-50 ease-in-out",
    background: "from-slate-900 via-orange-950 to-slate-900 transition-colors duration-50 ease-in-out",
    cardBg: "bg-orange-950/20 border-orange-400/30 transition-colors duration-50 ease-in-out",
    cardHover: "hover:bg-orange-900/30 hover:border-orange-300/50 hover:shadow-orange-400/20 transition-colors duration-50 ease-in-out",
    text: "text-orange-100 transition-colors duration-50 ease-in-out",
    glow: "shadow-orange-400/25 transition-shadow duration-50 ease-in-out",
  },
  night: {
    primary: "from-purple-400 to-indigo-500 transition-colors duration-50 ease-in-out",
    secondary: "from-violet-400 to-purple-500 transition-colors duration-50 ease-in-out",
    accent: "from-cyan-400 to-blue-500 transition-colors duration-50 ease-in-out",
    background: "from-slate-900 via-purple-950 to-slate-900 transition-colors duration-50 ease-in-out",
    cardBg: "bg-purple-950/20 border-purple-400/30 transition-colors duration-50 ease-in-out",
    cardHover: "hover:bg-purple-900/30 hover:border-purple-300/50 hover:shadow-purple-400/20 transition-colors duration-50 ease-in-out",
    text: "text-purple-100 transition-colors duration-50 ease-in-out",
    glow: "shadow-purple-400/25 transition-shadow duration-50 ease-in-out",
  },
}

/**
 * Hook que adapta la paleta de colores según la hora local del usuario.
 * - Actualiza cada minuto automáticamente.
 * - Devuelve el tema activo y sus colores.
 */
export function useThemeByTime() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("night")

  const calculateTheme = useCallback((): ThemeMode => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return "day"
    if (hour >= 12 && hour < 18) return "afternoon"
    return "night"
  }, [])

  useEffect(() => {
    setThemeMode(calculateTheme())
    const interval = setInterval(() => setThemeMode(calculateTheme()), 60_000)
    return () => clearInterval(interval)
  }, [calculateTheme])

  return {
    theme: themeMode,
    colors: futuristicThemes[themeMode],
  }
}