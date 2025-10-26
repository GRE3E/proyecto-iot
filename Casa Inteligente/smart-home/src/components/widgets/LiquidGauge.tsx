"use client"
import SimpleCard from "../UI/Card"
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
    <SimpleCard
      className={`p-4 md:p-6 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-[${color}]/30 border border-slate-700 bg-slate-900/40 backdrop-blur-md rounded-2xl`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-slate-800/70">{icon}</div>
        <h3 className="text-base md:text-lg font-semibold tracking-tight" style={{ color }}>
          {label}
        </h3>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgb(51,65,85)" strokeWidth="8" />
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
              style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl md:text-2xl font-bold text-white">{value}</span>
            <span className="text-xs md:text-sm text-slate-400">{unit}</span>
          </div>
        </div>
      </div>
    </SimpleCard>
  )
}
