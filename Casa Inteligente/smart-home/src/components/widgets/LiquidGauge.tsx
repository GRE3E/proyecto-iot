"use client"

import SimpleCard from "../UI/SimpleCard"
import type { ReactNode } from "react"

interface LiquidGaugeProps {
  value: number
  maxValue: number
  label: string
  color: string
  icon: ReactNode
  unit: string
}

export default function LiquidGauge({ value, maxValue, label, color, icon, unit }: LiquidGaugeProps) {
  const percentage = Math.min((value / maxValue) * 100, 100)

  return (
    <SimpleCard className="p-4 md:p-6 hover:scale-[1.02] transition-all duration-300 group font-inter">
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="p-2 rounded-lg bg-slate-700/50 group-hover:bg-slate-600/50 transition-colors">
          {icon}
        </div>
        <h3 className="text-base md:text-lg font-semibold tracking-tight" style={{ color }}>
          {label}
        </h3>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {/* Circular gauge */}
        <div className="relative w-24 md:w-32 h-24 md:h-32">
          <svg className="w-24 md:w-32 h-24 md:h-32 transform -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgb(51, 65, 85)" strokeWidth="8" />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - percentage / 100)}`}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 6px ${color}40)`,
              }}
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl md:text-2xl font-bold text-white font-inter">{value}</span>
            <span className="text-xs md:text-sm text-slate-400">{unit}</span>
          </div>
        </div>

        {/* Max value indicator */}
        <div className="text-center">
          <p className="text-xs text-slate-500 font-medium">
            Máx: {maxValue}{unit}
          </p>
        </div>
      </div>
    </SimpleCard>
  )
}