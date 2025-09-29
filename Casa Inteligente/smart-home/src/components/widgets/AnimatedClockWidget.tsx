"use client"
import { useState, useEffect } from "react"
import SimpleCard from "../UI/SimpleCard"
import { Clock, Calendar, Sun, ChevronDown, ChevronUp } from "lucide-react"

export default function AnimatedClockWidget() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [weather, setWeather] = useState("Soleado 22°C")
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
          className={`w-8 md:w-10 h-8 md:h-10 flex items-center justify-center rounded-lg transition-all duration-300 text-xs md:text-sm font-medium ${
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
    <SimpleCard className="p-4 md:p-6 relative overflow-hidden font-inter">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 opacity-40 animate-pulse" />
      <div className="relative z-10">
        <h2 className="text-lg md:text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2 tracking-tight">
          <Clock className="w-5 h-5" />
          Reloj Inteligente
        </h2>
        <div className="text-3xl md:text-5xl font-bold mb-2 animate-pulse font-mono">
          {currentTime.toLocaleTimeString()}
        </div>
        <div className="text-slate-400 mb-2 text-sm md:text-base font-medium">
          {currentTime.toLocaleDateString()}
        </div>
        <div className="text-purple-400 font-medium flex items-center gap-2 text-sm md:text-base">
          <Sun className="w-4 h-4" />
          {weather}
        </div>

        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="mt-4 px-3 md:px-4 py-2 rounded-xl bg-slate-700/50 text-slate-200 hover:bg-slate-600/70 transition-all flex items-center gap-2 text-sm md:text-base font-medium"
        >
          <Calendar className="w-4 h-4" />
          {showCalendar ? "Ocultar calendario" : "Mostrar calendario"}
          {showCalendar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showCalendar && (
          <div className="grid grid-cols-7 gap-1 md:gap-2 mt-4 animate-fadeIn">
            {generateCalendarDays()}
          </div>
        )}
      </div>
    </SimpleCard>
  )
}