"use client"

import SimpleCard from "../UI/SimpleCard"

type LiquidGaugeProps = {
  value: number
  maxValue: number
  label: string
  color: string
  icon: string
  unit: string
}

export default function LiquidGauge({
  value,
  maxValue,
  label,
  color,
  icon,
  unit,
}: LiquidGaugeProps) {
  // calcular porcentaje
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100)

  return (
    <SimpleCard className="p-6 text-center">
      <h2 className="text-xl font-semibold mb-4" style={{ color }}>
        {icon} {label}
      </h2>

      <div className="relative w-32 h-32 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Círculo de fondo */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="#1e293b"
            stroke={color}
            strokeWidth="4"
          />

          {/* Círculo de progreso */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="url(#wave)"
            transform="rotate(-90 50 50)"
            strokeDasharray={`${percentage * 2.83}, 283`}
            strokeLinecap="round"
          />

          <defs>
            <linearGradient id="wave" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="mt-4 text-2xl font-bold" style={{ color }}>
        {value}
        {unit}
      </div>
      <p className="text-sm text-slate-400">
        Máx: {maxValue}
        {unit}
      </p>
    </SimpleCard>
  )
}
