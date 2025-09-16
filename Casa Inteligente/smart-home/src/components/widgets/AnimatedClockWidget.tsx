"use client"
import { useState, useEffect } from "react"
import SimpleCard from "../UI/SimpleCard"

export default function AnimatedClockWidget() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [weather, setWeather] = useState("☀️ Soleado 22°C")
  const [showCalendar, setShowCalendar] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const generateCalendarDays = () => {
    const days = []
    const date = new Date()
    const today = date.getDate()
    for (let i = 1; i <= 30; i++) {
      days.push(
        <div
          key={i}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 ${
            i === today
              ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg"
              : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:scale-110"
          }`}
        >
          {i}
        </div>
      )
    }
    return days
  }

  return (
    <SimpleCard className="p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 opacity-40 animate-pulse" />
      <div className="relative z-10">
        <h2 className="text-xl font-semibold text-cyan-400 mb-4">⏰ Reloj Inteligente</h2>
        <div className="text-5xl font-bold mb-2 animate-pulse">
          {currentTime.toLocaleTimeString()}
        </div>
        <div className="text-slate-400 mb-2">{currentTime.toLocaleDateString()}</div>
        <div className="text-purple-400 font-medium">{weather}</div>

        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="mt-4 px-4 py-2 rounded-xl bg-slate-700/50 text-slate-200 hover:bg-slate-600/70 transition-all"
        >
          📅 {showCalendar ? "Ocultar calendario" : "Mostrar calendario"}
        </button>

        {showCalendar && (
          <div className="grid grid-cols-7 gap-2 mt-4 animate-fadeIn">
            {generateCalendarDays()}
          </div>
        )}
      </div>
    </SimpleCard>
  )
}
