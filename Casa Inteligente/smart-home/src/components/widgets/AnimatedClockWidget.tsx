"use client"

import { useState, useEffect } from "react"
import SimpleCard from "../UI/Card"
import { Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { getWeatherData, generateParticles, updateParticles } from "../../utils/widgetUtils"

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
  const [currentMonth, setCurrentMonth] = useState(currentTime.getMonth())
  const [currentYear, setCurrentYear] = useState(currentTime.getFullYear())

  const weather = getWeatherData(temperature)

  // reloj actualiza cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // valores reloj
  const hours = currentTime.getHours() % 12
  const minutes = currentTime.getMinutes()
  const seconds = currentTime.getSeconds()
  const hourDeg = (hours + minutes / 60) * 30
  const minuteDeg = (minutes + seconds / 60) * 6
  const secondDeg = seconds * 6

  // calendario
  const today = new Date()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array(firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1).fill(null)

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear()
  const currentDay = today.getDate()

  return (
    <SimpleCard className="relative p-6 md:p-8 bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/40 shadow-2xl rounded-2xl overflow-hidden">
      {/* Partículas decorativas */}
      <AnimatedParticles />
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-pink-500/10 to-cyan-500/10 opacity-30 blur-3xl -z-10" />

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <h2 className="text-lg md:text-xl font-semibold text-cyan-400 flex items-center gap-2 tracking-tight">
          <Clock className="w-5 h-5" />
          Reloj Inteligente HUD
        </h2>

        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
          {/* Reloj digital + analógico */}
          <div className="flex flex-col items-center gap-4 md:w-1/3">
            <div className="text-3xl md:text-4xl font-bold text-white font-mono drop-shadow-lg tracking-widest mb-2">
              {currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>

            <div className="relative w-44 h-44 rounded-full border-4 border-slate-500/40 flex items-center justify-center bg-slate-900/70 backdrop-blur-md shadow-inner">
              {/* Marcas */}
              {Array.from({ length: 60 }).map((_, i) => {
                const angle = (i * 6 * Math.PI) / 180
                const x = 50 + 45 * Math.sin(angle)
                const y = 50 - 45 * Math.cos(angle)
                return (
                  <div
                    key={i}
                    className={`absolute ${i % 5 === 0 ? "w-1.5 h-4 bg-white/80" : "w-1 h-2 bg-slate-400/60"}`}
                    style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
                  />
                )
              })}
              {/* Manecillas */}
              <div
                className="absolute bg-cyan-300 rounded-full"
                style={{
                  width: "3px",
                  height: "38%",
                  bottom: "50%",
                  left: "50%",
                  transformOrigin: "bottom center",
                  transform: `translateX(-50%) rotate(${hourDeg}deg)`
                }}
              />
              <div
                className="absolute bg-white rounded-full"
                style={{
                  width: "2px",
                  height: "48%",
                  bottom: "50%",
                  left: "50%",
                  transformOrigin: "bottom center",
                  transform: `translateX(-50%) rotate(${minuteDeg}deg)`
                }}
              />
              <div
                className="absolute bg-pink-500 rounded-full shadow-lg"
                style={{
                  width: "1.5px",
                  height: "52%",
                  bottom: "50%",
                  left: "50%",
                  transformOrigin: "bottom center",
                  transform: `translateX(-50%) rotate(${secondDeg}deg)`
                }}
              />
              <div className="absolute w-5 h-5 bg-gradient-to-br from-slate-200 to-slate-500 rounded-full shadow-lg border-2 border-slate-700 z-10" />
            </div>

            <div className="text-slate-300 text-sm md:text-base font-medium text-center mt-2">
              {currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          {/* Clima */}
          <div className="relative flex flex-col items-center justify-center px-4 py-6 md:px-6 md:py-8 rounded-2xl bg-gradient-to-br from-blue-800/60 via-purple-800/50 to-cyan-800/60 border border-cyan-400/20 shadow-[0_0_15px_rgba(0,255,255,0.2)] backdrop-blur-lg md:w-1/3">
            <div className="w-24 h-24 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-700/50 via-purple-700/40 to-cyan-700/50 border border-cyan-400/30 shadow-[0_0_10px_rgba(0,255,255,0.2)] animate-pulse">
              {weather.icon}
            </div>
            <div className="text-center mt-3 text-slate-100 font-semibold tracking-wide">
              <div className="text-lg md:text-xl">{weather.label}</div>
              <div className="text-2xl md:text-3xl font-bold">{temperature}°C</div>
              <div className="text-sm md:text-base text-cyan-200/70 italic mt-1">{weather.advice}</div>
            </div>
          </div>

          {/* Calendario */}
          <div className="space-y-4 md:w-1/3">
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="p-2 rounded-lg bg-slate-800/30 hover:bg-slate-700/40 transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-200" />
              </button>
              <h4 className="text-lg font-semibold text-slate-200">
                {new Date(currentYear, currentMonth).toLocaleString("es-ES", { month: "long", year: "numeric" }).toUpperCase()}
              </h4>
              <button onClick={nextMonth} className="p-2 rounded-lg bg-slate-800/30 hover:bg-slate-700/40 transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-200" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="text-xs font-medium text-slate-400">{d}</div>
              ))}
              {emptyDays.map((_, i) => <div key={`e-${i}`} className="h-10" />)}
              {days.map((day) => (
                <div
                  key={day}
                  className={`relative h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 ${
                    isCurrentMonth && day === currentDay
                      ? "bg-gradient-to-br from-purple-500/40 to-pink-500/40 text-white shadow-lg"
                      : "text-slate-400 hover:bg-slate-700/30"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SimpleCard>
  )
}
