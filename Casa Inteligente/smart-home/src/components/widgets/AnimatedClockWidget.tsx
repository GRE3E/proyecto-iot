"use client"

import { useState, useEffect } from "react"
import SimpleCard from "../UI/Card"
import { Sun, Cloud, CloudRain } from "lucide-react"
import { getWeatherData } from "../../utils/widgetUtils"
import { useZonaHoraria } from "../../hooks/useZonaHoraria"

export default function AnimatedClockWidget({ temperature }: { temperature?: number }) {
  const { selectedTimezone, currentTime, currentDate } = useZonaHoraria()
  const [realTemperature, setRealTemperature] = useState(temperature || 22)
  const [weatherCondition, setWeatherCondition] = useState('Cloudy')

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            const response = await fetch(`https://wttr.in/${latitude},${longitude}?format=j1`)
            const data = await response.json()
            const temp = parseInt(data.current_condition[0].temp_C)
            const condition = data.current_condition[0].weatherDesc[0].value
            setRealTemperature(temp)
            setWeatherCondition(condition)
          } catch (error) {
            console.error('Error fetching weather:', error)
          }
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }, [])

  const weather = getWeatherData(realTemperature, weatherCondition)
  const humidity = Math.max(10, Math.min(90, Math.round(50 + (Math.sin(Date.now() / 60000) * 10))))
  const wind = Math.max(0, Math.round(5 + (Math.cos(Date.now() / 90000) * 3)))

  const forecast = [
    { day: "LUN", icon: Cloud, hi: 30, lo: 21 },
    { day: "MAR", icon: Sun, hi: 32, lo: 22 },
    { day: "MIER", icon: Sun, hi: 31, lo: 21 },
    { day: "JUV", icon: CloudRain, hi: 28, lo: 20 },
    { day: "VIE", icon: Sun, hi: 30, lo: 21 },
    { day: "SAB", icon: Cloud, hi: 29, lo: 22 },
  ]

  const parseTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    return { hours, minutes }
  }

  const { hours: parsedHours, minutes: parsedMinutes } = currentTime 
    ? parseTime(currentTime) 
    : { hours: new Date().getHours() % 12, minutes: new Date().getMinutes() }

  const hourDeg = (parsedHours + parsedMinutes / 60) * 30
  const minuteDeg = parsedMinutes * 6

  return (
    <SimpleCard className="relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/85 border border-slate-700/40 p-5 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.8fr] gap-5 md:gap-6">
        
        {/* Left: Clock & Date */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-4xl md:text-5xl font-bold text-white font-mono tracking-wider mb-3">
            {currentTime || "00:00"}
          </div>
          
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-slate-600/40 flex items-center justify-center bg-gradient-to-b from-slate-800/70 to-slate-900/70">
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180
              const numberX = 50 + 36 * Math.sin(angle)
              const numberY = 50 - 36 * Math.cos(angle)
              const number = i === 0 ? 12 : i
              return (
                <div key={i} className="absolute text-cyan-300/90 text-xs font-bold font-mono" style={{ left: `${numberX}%`, top: `${numberY}%`, transform: "translate(-50%, -50%)" }}>
                  {number}
                </div>
              )
            })}
            <div className="absolute bg-cyan-400 rounded-full" style={{ width: "2px", height: "32%", bottom: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${hourDeg}deg)` }} />
            <div className="absolute bg-white rounded-full" style={{ width: "1px", height: "36%", bottom: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${minuteDeg}deg)` }} />
            <div className="absolute w-2 h-2 bg-cyan-300 rounded-full" />
          </div>
          
          <div className="text-xs text-slate-400 font-medium mt-3">
            {currentDate || new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          
          {selectedTimezone && (
            <div className="text-xs text-slate-500 mt-2">
              {selectedTimezone.region} • {selectedTimezone.offset}
            </div>
          )}
        </div>

        {/* Right: Weather */}
        <div className="rounded-xl bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-cyan-500/25 p-4 md:p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium mb-1">Clima</p>
                <p className="text-lg md:text-xl font-bold text-cyan-300">{weather.label}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl md:text-3xl font-bold text-orange-400">{realTemperature}°C</p>
              </div>
            </div>
            
            <p className="text-xs md:text-sm text-slate-300 italic leading-relaxed">{weather.advice}</p>
            
            <div className="flex gap-3 mt-2">
              <div className="flex-1 flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/5 rounded-lg px-3 py-2 border border-cyan-500/20">
                <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">{humidity}%</div>
              </div>
              <div className="flex-1 flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/5 rounded-lg px-3 py-2 border border-cyan-500/20">
                <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">{wind} km/h</div>
              </div>
            </div>
          </div>

          {/* Forecast */}
          <div className="mt-3 pt-3 border-t border-slate-700/30">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-2.5">Pronóstico</p>
            <div className="grid grid-cols-6 gap-1.5">
              {forecast.map((f, i) => {
                const Icon = f.icon
                return (
                  <div key={i} className="flex flex-col items-center text-center bg-slate-900/50 rounded-lg py-2 px-1 border border-slate-700/20">
                    <p className="text-xs font-semibold text-slate-400">{f.day}</p>
                    <Icon className="w-3 h-3 md:w-4 md:h-4 text-slate-300 my-1" />
                    <p className="text-xs font-bold text-cyan-400">{f.lo}° / {f.hi}°</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </SimpleCard>
  )
}