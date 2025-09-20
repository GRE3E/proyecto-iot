"use client"
import React from "react"
import { useThemeByTime } from "../hooks/useThemeByTime"

const SimpleCard = React.memo(({ children, className = "" }: any) => {
  const { colors } = useThemeByTime()

  return (
    <div
      className={`${colors.cardBg} backdrop-blur-xl border rounded-2xl transition-all duration-500 ${colors.cardHover} hover:shadow-lg ${className}`}
    >
      {children}
    </div>
  )
})

export default SimpleCard
