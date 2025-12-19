//Boton Universal
"use client"
import React from "react"
import { useThemeByTime } from "../../hooks/useThemeByTime"

const SimpleButton = React.memo(({ children, onClick, active = false, className = "", disabled = false }: any) => {
  const { colors } = useThemeByTime()

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-500 transform hover:scale-105 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? `bg-gradient-to-r ${colors.primary} text-white shadow-lg ${colors.glow} border border-white/20`
          : `${colors.cardBg} ${colors.text} border ${colors.cardHover} hover:shadow-md`
      } ${className}`}
    >
      {children}
    </button>
  )
})

export default SimpleButton
