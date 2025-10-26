//indicador circular de energia
// EnergyGauge.tsx
"use client"

import React from "react"
import { motion } from "framer-motion"

export interface EnergyGaugeProps {
  value: number
  maxValue: number
  label: string
  color: string
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>
}

export default function EnergyGauge({ value, maxValue, label, color, icon }: EnergyGaugeProps) {
  const percentage = (value / maxValue) * 100
  const fluidHeight = Math.min(Math.max(percentage, 5), 100)
  // Mantengo la clase dinámica igual que en tu original (si usas Tailwind JIT/safelist no dará problema)
  const gradientColor = `from-${color}-400 to-${color}-600`

  // como respaldo visual en caso de que Tailwind elimine clases dinámicas,
  // aplico un style fallback para el drop-shadow; la clase gradiente queda igual al original
  const dropShadowColor = color

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="w-32 h-32 md:w-40 md:h-40 relative flex items-center justify-center">
        <div className="w-full h-full rounded-full border-4 border-slate-700/50 relative overflow-hidden shadow-inner shadow-slate-900/40">
          <motion.div
            className={`w-full absolute bottom-0 bg-gradient-to-t ${gradientColor}`}
            initial={{ height: "0%" }}
            animate={{ height: `${fluidHeight}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            style={{ filter: `drop-shadow(0 0 5px ${dropShadowColor})` }}
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center bg-slate-800/60 backdrop-blur-sm">
            {React.cloneElement(icon, { className: "w-8 h-8 md:w-10 md:h-10 text-white" })}
          </div>
          <p className="mt-2 text-base md:text-xl font-bold text-white font-inter">
            {value}
            <span className="text-sm md:text-base font-semibold text-white"> kWh</span>
          </p>
          <p className="text-xs md:text-sm text-white font-medium">{label}</p>
        </div>
      </div>
    </div>
  )
}
