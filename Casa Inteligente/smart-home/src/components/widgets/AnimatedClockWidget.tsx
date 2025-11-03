"use client"

import { useState, useEffect } from "react"
import SimpleCard from "../UI/Card"
import { Clock, Cloud, Sun, CloudRain } from "lucide-react"
import { getWeatherData, generateParticles, updateParticles } from "../../utils/widgetUtils"
import { generateSparklinePoints } from "../../utils/chatUtils"

function AnimatedParticles() {
  const [particles, setParticles] = useState(generateParticles())

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) => updateParticles(prev))
    }, 30)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute bg-cyan-400/20 rounded-full animate-pulse"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            filter: "blur(2px)"
          }}
        />
      ))}
    </>
  )
}

export default function AnimatedClockWidget({ temperature = 22 }: { temperature?: number }) {
  const [currentTime, setCurrentTime] = useState(new Date())

  const weather = getWeatherData(temperature)
  // mock extra metrics (replace with real API if available)
  const humidity = Math.max(10, Math.min(90, Math.round(50 + (Math.sin(Date.now() / 60000) * 10))))
  const wind = Math.max(0, Math.round(5 + (Math.cos(Date.now() / 90000) * 3)))
  const tempHistory = [temperature - 2, temperature - 1, temperature - 1, temperature, temperature + 1, temperature] // mock
  const sparkPoints = generateSparklinePoints(tempHistory.map((t) => Math.round(t)))

  // mock forecast (could be replaced with real API data)
  const forecast = [
    { day: "LUN", icon: Cloud, hi: 30, lo: 21 },
    { day: "MAR", icon: Sun, hi: 32, lo: 22 },
    { day: "MIER", icon: Sun, hi: 31, lo: 21 },
    { day: "JUV", icon: CloudRain, hi: 28, lo: 20 },
    { day: "SAB", icon: Cloud, hi: 29, lo: 22 },
  ]

  // reloj actualiza cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // valores reloj (sin segundos para evitar movimiento excesivo)
  const hours = currentTime.getHours() % 12
  const minutes = currentTime.getMinutes()
  const hourDeg = (hours + minutes / 60) * 30
  const minuteDeg = minutes * 6

  return (
  <SimpleCard className="relative p-6 md:p-8 bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/40 shadow-2xl rounded-2xl overflow-hidden min-h-[260px] md:min-h-[300px]">
      {/* Partículas decorativas */}
      <AnimatedParticles />
  <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/8 via-pink-500/8 to-cyan-500/8 opacity-20 blur-2xl -z-10" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base md:text-lg text-cyan-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Reloj Inteligente HUD
          </h2>
        </div>

    {/* Main row: Time (left) + Weather (right) */}
  <div className="grid grid-cols-[minmax(340px,460px)_1fr] items-center gap-8 w-full">
    {/* Left: Time big + small analog (centrado dentro de su columna) */}
    <div className="flex flex-col items-center justify-center gap-4 h-full">
            <div className="text-6xl md:text-7xl font-bold text-white font-mono tracking-wider">{currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="relative w-44 h-44 rounded-full md:w-48 md:h-48 border-2 border-slate-500/30 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm shadow-inner">
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180
                const x = 50 + 44 * Math.sin(angle)
                const y = 50 - 44 * Math.cos(angle)
                return <div key={i} className="absolute w-1.5 h-3 md:w-2 md:h-4 bg-white/90" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }} />
              })}
              <div className="absolute bg-cyan-300 rounded-full" style={{ width: "2px", height: "34%", bottom: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${hourDeg}deg)` }} />
              <div className="absolute bg-white rounded-full" style={{ width: "1.2px", height: "44%", bottom: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${minuteDeg}deg)` }} />
            </div>
            <div className="text-base text-slate-300">{currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>

          {/* Right: Weather card (inline, centrado) */}
          <div className="w-full">
            <div className="rounded-2xl bg-gradient-to-br from-blue-800/40 via-purple-800/25 to-cyan-800/40 border border-cyan-400/10 p-4 md:p-6 shadow-lg h-full flex flex-col justify-center items-center text-center">
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-center w-full">
                <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-700/30 via-purple-700/20 to-cyan-700/30 border border-cyan-400/10">
                  {weather.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <div className="text-base md:text-lg font-semibold text-white">{weather.label}</div>
                      <div className="text-xs md:text-sm text-cyan-200/70 italic">{weather.advice}</div>
                      <div className="mt-2 text-xs text-slate-300">Humedad: <span className="text-cyan-200 font-semibold">{humidity}%</span> · Viento: <span className="text-cyan-200 font-semibold">{wind} km/h</span></div>
                    </div>
                    <div className="text-4xl md:text-5xl font-bold text-white">{temperature}°C</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-3 w-full">
                <svg viewBox="0 0 100 20" className="w-full md:w-1/2 h-8 hidden md:block">
                  <polyline fill="none" stroke="#06b6d4" strokeWidth={2} points={sparkPoints} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex-1">
                  <div className="grid grid-cols-5 gap-3 text-sm md:text-xs lg:text-sm text-slate-200">
                    {forecast.map((f, i) => {
                      const Icon = f.icon as any
                      return (
                        <div key={i} className="flex flex-col items-center">
                          <div className="text-cyan-200/70 text-sm">{f.day}</div>
                          <div className="mt-1"><Icon className="w-6 h-6 text-slate-200" /></div>
                          <div className="mt-1 font-medium">{f.hi}°</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SimpleCard>
  )
}
