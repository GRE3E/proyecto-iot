"use client"
import { useState, useEffect, useCallback } from "react"
import "../styles/animations.css"
export type ThemeMode = "dark" | "light"

const themes: Record<ThemeMode, Record<string, string>> = {
  dark: {
    // Colores principales
    primary: "from-indigo-500 to-cyan-500",
    secondary: "from-fuchsia-500 to-violet-500",
    accent: "from-cyan-500 to-indigo-600",
    
    // Fondos
    background: "bg-gradient-to-br from-slate-950 via-slate-900 to-black",
    cardBg: "bg-slate-900/60 border-slate-700/50",
    cardHover: "hover:bg-slate-800/60 hover:border-slate-500/50 hover:shadow-indigo-500/20",
    
    // Textos
    text: "text-white",
    mutedText: "text-slate-400",
    
    // Bordes
    border: "border-slate-700/50",
    cardBorder: "border-slate-700/50",
    
    // Chips y etiquetas
    chipBg: "bg-slate-800/60 border-slate-600/40",
    chipText: "text-slate-200",
    successChip: "bg-emerald-900/30 text-emerald-300 border border-emerald-400/30",
    dangerChip: "bg-rose-900/30 text-rose-300 border border-rose-400/30",
    warningChip: "bg-amber-900/30 text-amber-300 border border-amber-400/30",
    
    // Inputs
    inputBg: "bg-slate-800",
    inputBorder: "border-slate-700",
    
    // Iconos
    icon: "text-white",
    
    // Headers
    headerBg: "bg-black/20 border-white/10",
    title: "text-white",
    
    // Efectos
    glow: "shadow-indigo-500/30",
    
    // Modales y overlays
    modalBg: "bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95",
    backdropBg: "bg-black/50",
    
    // Botones de estado
    buttonActive: "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent shadow-indigo-500/20",
    buttonInactive: "bg-slate-800/60 border border-slate-600/40 text-slate-200",
    buttonHover: "hover:bg-slate-700/60",
    
    // Gradientes de sección
    purpleGradient: "from-purple-500/10 to-blue-500/10 border-purple-500/30",
    greenGradient: "from-emerald-950/40 to-emerald-900/20 border-emerald-500/30",
    orangeGradient: "from-orange-950/40 to-orange-900/20 border-orange-500/30",
    cyanGradient: "from-cyan-950/40 to-cyan-900/20 border-cyan-500/30",
    violetGradient: "from-violet-950/40 to-violet-900/20 border-violet-500/30",
    
    // Colores de texto temáticos
    purpleText: "text-purple-300",
    greenText: "text-emerald-300",
    orangeText: "text-orange-300",
    cyanText: "text-cyan-300",
    violetText: "text-violet-300",
    
    // Iconos temáticos
    purpleIcon: "text-purple-400",
    greenIcon: "text-emerald-400",
    orangeIcon: "text-orange-400",
    cyanIcon: "text-cyan-400",
    violetIcon: "text-violet-400",
    yellowIcon: "text-yellow-400",
    redIcon: "text-red-400",
    
    // Fondos de tarjetas temáticas
    energyCard: "bg-gradient-to-br from-emerald-950/40 to-emerald-900/20",
    tempCard: "bg-gradient-to-br from-orange-950/40 to-orange-900/20",
    humidityCard: "bg-gradient-to-br from-cyan-950/40 to-cyan-900/20",
    devicesCard: "bg-gradient-to-br from-violet-950/40 to-violet-900/20",
    
    // Sombras temáticas
    energyShadow: "shadow-emerald-500/20",
    tempShadow: "shadow-orange-500/20",
    humidityShadow: "shadow-cyan-500/20",
    devicesShadow: "shadow-violet-500/20",
    
    // Bordes temáticos
    energyBorder: "border-emerald-500/30",
    tempBorder: "border-orange-500/30",
    humidityBorder: "border-cyan-500/30",
    devicesBorder: "border-violet-500/30",
    
    // Estados de dispositivos
    deviceOn: "bg-green-500/20 shadow-green-500/20",
    deviceOff: "bg-red-500/20 shadow-red-500/20",
    deviceActive: "bg-green-400 animate-pulse shadow-green-400/50",
    deviceInactive: "bg-red-400",

    // NUEVAS ADICIONES PARA COMPATIBILIDAD TOTAL
    // Widgets de reloj y clima
    clockBg: "from-slate-800/60 via-blue-900/40 to-slate-800/50",
    clockBorder: "border-blue-700/30",
    weatherBg: "from-blue-900/30 to-cyan-900/25",
    weatherBorder: "border-cyan-500/25",
    clockNumbers: "text-cyan-300",
    clockHourHand: "bg-cyan-400",
    clockMinuteHand: "bg-white",
    clockCenter: "bg-cyan-300",
    weatherLabel: "text-slate-300",
    weatherTemperature: "text-orange-400",
    weatherHumidity: "text-cyan-400",
    weatherWind: "text-cyan-400",
    weatherAdvice: "text-slate-300",
    forecastBg: "bg-slate-900/40",
    forecastBorder: "border-slate-700/30",
    forecastCardBg: "bg-slate-900/50",
    forecastCardBorder: "border-slate-700/20",
    forecastDay: "text-slate-400",
    forecastTemp: "text-cyan-400",
    forecastIcon: "text-slate-300",
    timezoneText: "text-slate-500",
    dateText: "text-slate-400",

    // Paneles de control
    panelBg: "bg-slate-800/40",
    panelText: "text-slate-200",
    panelAccent: "text-cyan-400",
    
    // Barras y sliders
    sliderBg: "bg-slate-700",
    sliderAccent: "accent-cyan-500",
    sliderTrack: "from-green-400 via-yellow-400 to-red-400",
    
    // Tablas y listas
    tableBg: "bg-slate-800/30",
    tableText: "text-slate-100",
    tableAlt: "bg-slate-800/60",
    
    // Notificaciones
    notifySuccess: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    notifyError: "bg-red-500/20 text-red-300 border-red-500/30",
    notifyInfo: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    notifyWarning: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  },
  light: {
    // Colores principales
    primary: "from-blue-500 to-cyan-500",
    secondary: "from-violet-500 to-pink-500",
    accent: "from-blue-400 to-cyan-400",
    
    // Fondos
    background: "bg-white",
    cardBg: "bg-white border-slate-200",
    cardHover: "hover:bg-slate-50 hover:border-slate-300 hover:shadow-blue-300/20",
    
    // Textos
    text: "text-slate-900",
    mutedText: "text-slate-500",
    
    // Bordes
    border: "border-slate-300",
    cardBorder: "border-slate-200",
    
    // Chips y etiquetas
    chipBg: "bg-slate-100 border-slate-300",
    chipText: "text-slate-900",
    successChip: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dangerChip: "bg-rose-50 text-rose-700 border border-rose-200",
    warningChip: "bg-amber-50 text-amber-700 border border-amber-200",
    
    // Inputs
    inputBg: "bg-white",
    inputBorder: "border-slate-300",
    
    // Iconos
    icon: "text-slate-800",
    
    // Headers
    headerBg: "bg-white/60 border-slate-200",
    title: "text-slate-900",
    
    // Efectos
    glow: "shadow-indigo-300/30",
    
    // Modales y overlays
    modalBg: "bg-white",
    backdropBg: "bg-slate-900/20",
    
    // Botones de estado
    buttonActive: "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-transparent shadow-blue-500/20",
    buttonInactive: "bg-slate-100 border border-slate-300 text-slate-700",
    buttonHover: "hover:bg-slate-200",
    
    // Gradientes de sección
    purpleGradient: "from-purple-50 to-blue-50 border-purple-200",
    greenGradient: "from-emerald-50 to-emerald-100/50 border-emerald-200",
    orangeGradient: "from-orange-50 to-orange-100/50 border-orange-200",
    cyanGradient: "from-cyan-50 to-cyan-100/50 border-cyan-200",
    violetGradient: "from-violet-50 to-violet-100/50 border-violet-200",
    
    // Colores de texto temáticos
    purpleText: "text-purple-700",
    greenText: "text-emerald-700",
    orangeText: "text-orange-700",
    cyanText: "text-cyan-700",
    violetText: "text-violet-700",
    
    // Iconos temáticos
    purpleIcon: "text-purple-600",
    greenIcon: "text-emerald-600",
    orangeIcon: "text-orange-600",
    cyanIcon: "text-cyan-600",
    violetIcon: "text-violet-600",
    yellowIcon: "text-yellow-600",
    redIcon: "text-red-600",
    
    // Fondos de tarjetas temáticas
    energyCard: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
    tempCard: "bg-gradient-to-br from-orange-50 to-orange-100/50",
    humidityCard: "bg-gradient-to-br from-cyan-50 to-cyan-100/50",
    devicesCard: "bg-gradient-to-br from-violet-50 to-violet-100/50",
    
    // Sombras temáticas
    energyShadow: "shadow-emerald-200/40",
    tempShadow: "shadow-orange-200/40",
    humidityShadow: "shadow-cyan-200/40",
    devicesShadow: "shadow-violet-200/40",
    
    // Bordes temáticos
    energyBorder: "border-emerald-200",
    tempBorder: "border-orange-200",
    humidityBorder: "border-cyan-200",
    devicesBorder: "border-violet-200",
    
    // Estados de dispositivos
    deviceOn: "bg-green-100 shadow-green-200/40",
    deviceOff: "bg-red-100 shadow-red-200/40",
    deviceActive: "bg-green-500 animate-pulse shadow-green-500/50",
    deviceInactive: "bg-red-500",

    // NUEVAS ADICIONES PARA COMPATIBILIDAD TOTAL
    // Widgets de reloj y clima
    clockBg: "from-blue-50 via-blue-100/80 to-cyan-50",
    clockBorder: "border-blue-200/60",
    weatherBg: "from-blue-100/80 to-cyan-100/60",
    weatherBorder: "border-blue-300/40",
    clockNumbers: "text-blue-600",
    clockHourHand: "bg-blue-500",
    clockMinuteHand: "bg-blue-700",
    clockCenter: "bg-blue-400",
    weatherLabel: "text-blue-700",
    weatherTemperature: "text-orange-500",
    weatherHumidity: "text-blue-500",
    weatherWind: "text-blue-500",
    weatherAdvice: "text-blue-600",
    forecastBg: "bg-blue-50/70",
    forecastBorder: "border-blue-200/50",
    forecastCardBg: "bg-blue-50/80",
    forecastCardBorder: "border-blue-200/40",
    forecastDay: "text-blue-600",
    forecastTemp: "text-blue-700",
    forecastIcon: "text-blue-500",
    timezoneText: "text-blue-600",
    dateText: "text-blue-700",

    // Paneles de control
    panelBg: "bg-slate-100/60",
    panelText: "text-slate-700",
    panelAccent: "text-blue-600",
    
    // Barras y sliders
    sliderBg: "bg-slate-300",
    sliderAccent: "accent-blue-500",
    sliderTrack: "from-green-500 via-yellow-500 to-red-500",
    
    // Tablas y listas
    tableBg: "bg-slate-50",
    tableText: "text-slate-900",
    tableAlt: "bg-slate-100/50",
    
    // Notificaciones
    notifySuccess: "bg-emerald-50 text-emerald-700 border-emerald-200",
    notifyError: "bg-red-50 text-red-700 border-red-200",
    notifyInfo: "bg-blue-50 text-blue-700 border-blue-200",
    notifyWarning: "bg-yellow-50 text-yellow-700 border-yellow-200",
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