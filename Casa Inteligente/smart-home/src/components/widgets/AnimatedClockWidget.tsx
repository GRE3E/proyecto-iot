"use client"

import { useState, useEffect } from "react"
import SimpleCard from "../UI/Card"
import { Sun, Cloud, CloudRain } from "lucide-react"
import { getWeatherData } from "../../utils/widgetUtils"
import { useZonaHoraria } from "../../hooks/useZonaHoraria"
import { useThemeByTime } from "../../hooks/useThemeByTime"

export default function AnimatedClockWidget({ temperature }: { temperature?: number }) {
  const { selectedTimezone, currentTime, currentDate } = useZonaHoraria()
  const { theme } = useThemeByTime()
  const [realTemperature, setRealTemperature] = useState(temperature || 22)
  const [weatherCondition, setWeatherCondition] = useState('Cloudy')

  // Colores temáticos para el widget
  const widgetTheme = {
    light: {
      clockBg: "from-blue-50 via-blue-100/80 to-cyan-50",
      clockBorder: "border-blue-200/60",
      weatherBg: "from-blue-100/80 to-cyan-100/60",
      weatherBorder: "border-blue-300/40",
      clockNumbers: "text-blue-600",
      clockHourHand: "bg-blue-500",
      clockMinuteHand: "bg-blue-700",
      clockCenter: "bg-blue-400",
      forecastBg: "bg-blue-50/70",
      forecastBorder: "border-blue-200/50",
      forecastText: "text-blue-600",
      temperatureText: "text-orange-500",
      humidityText: "text-blue-500",
      windText: "text-blue-500",
      labelText: "text-blue-700",
      adviceText: "text-blue-600",
      forecastCardBg: "bg-blue-50/80",
      forecastCardBorder: "border-blue-200/40",
      forecastDayText: "text-blue-600",
      forecastTempText: "text-blue-700",
      forecastIcon: "text-blue-500",
      timezoneText: "text-blue-600",
      dateText: "text-blue-700",
    },
    dark: {
      clockBg: "from-slate-800/60 via-blue-900/40 to-slate-800/50",
      clockBorder: "border-blue-700/30",
      weatherBg: "from-blue-900/30 to-cyan-900/25",
      weatherBorder: "border-cyan-500/25",
      clockNumbers: "text-cyan-300",
      clockHourHand: "bg-cyan-400",
      clockMinuteHand: "bg-white",
      clockCenter: "bg-cyan-300",
      forecastBg: "bg-slate-900/40",
      forecastBorder: "border-slate-700/30",
      forecastText: "text-slate-300",
      temperatureText: "text-orange-400",
      humidityText: "text-cyan-400",
      windText: "text-cyan-400",
      labelText: "text-slate-300",
      adviceText: "text-slate-300",
      forecastCardBg: "bg-slate-900/50",
      forecastCardBorder: "border-slate-700/20",
      forecastDayText: "text-slate-400",
      forecastTempText: "text-cyan-400",
      forecastIcon: "text-slate-300",
      timezoneText: "text-slate-500",
      dateText: "text-slate-400",
    },
  }

  const currentTheme = widgetTheme[theme]

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
    <SimpleCard className={`relative overflow-hidden bg-gradient-to-br ${currentTheme.clockBg} border ${currentTheme.clockBorder} p-5 md:p-6 backdrop-blur-md shadow-xl`}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.8fr] gap-5 md:gap-6">
        
        {/* Left: Clock & Date */}
        <div className="flex flex-col items-center justify-center">
          <div className={`text-4xl md:text-5xl font-bold font-mono tracking-wider mb-3 ${currentTheme.labelText}`}>
            {currentTime || "00:00"}
          </div>
          
          <div className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full border-2 ${currentTheme.clockBorder} flex items-center justify-center bg-gradient-to-b ${currentTheme.clockBg} shadow-inner`}>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180
              const numberX = 50 + 36 * Math.sin(angle)
              const numberY = 50 - 36 * Math.cos(angle)
              const number = i === 0 ? 12 : i
              return (
                <div key={i} className={`absolute text-xs font-bold font-mono ${currentTheme.clockNumbers}`} style={{ left: `${numberX}%`, top: `${numberY}%`, transform: "translate(-50%, -50%)" }}>
                  {number}
                </div>
              )
            })}
            <div className={`absolute rounded-full ${currentTheme.clockHourHand}`} style={{ width: "2px", height: "32%", bottom: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${hourDeg}deg)`, boxShadow: "0 0 4px currentColor" }} />
            <div className={`absolute rounded-full ${currentTheme.clockMinuteHand}`} style={{ width: "1px", height: "36%", bottom: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${minuteDeg}deg)`, boxShadow: "0 0 3px currentColor" }} />
            <div className={`absolute w-2 h-2 ${currentTheme.clockCenter} rounded-full shadow-lg`} />
          </div>
          
          <div className={`text-xs font-medium mt-3 ${currentTheme.dateText}`}>
            {currentDate || new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          
          {selectedTimezone && (
            <div className={`text-xs mt-2 ${currentTheme.timezoneText}`}>
              {selectedTimezone.region} • {selectedTimezone.offset}
            </div>
          )}
        </div>

        {/* Right: Weather */}
        <div className={`rounded-xl bg-gradient-to-br ${currentTheme.weatherBg} border ${currentTheme.weatherBorder} p-4 md:p-5 flex flex-col justify-between backdrop-blur-sm`}>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium mb-1 ${currentTheme.labelText}`}>Clima</p>
                <p className={`text-lg md:text-xl font-bold ${currentTheme.adviceText}`}>{weather.label}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl md:text-3xl font-bold ${currentTheme.temperatureText}`}>{realTemperature}°C</p>
              </div>
            </div>
            
            <p className={`text-xs md:text-sm italic leading-relaxed ${currentTheme.adviceText}`}>{weather.advice}</p>
            
            <div className="flex gap-3 mt-2">
              <div className={`flex-1 flex items-center gap-2 bg-gradient-to-r ${theme === "light" ? "from-blue-400/15 to-cyan-400/10" : "from-cyan-500/10 to-blue-500/5"} rounded-lg px-3 py-2 border ${currentTheme.weatherBorder}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider ${currentTheme.humidityText}`}>{humidity}%</div>
              </div>
              <div className={`flex-1 flex items-center gap-2 bg-gradient-to-r ${theme === "light" ? "from-blue-400/15 to-cyan-400/10" : "from-cyan-500/10 to-blue-500/5"} rounded-lg px-3 py-2 border ${currentTheme.weatherBorder}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider ${currentTheme.windText}`}>{wind} km/h</div>
              </div>
            </div>
          </div>

          {/* Forecast */}
          <div className={`mt-3 pt-3 border-t ${currentTheme.forecastBorder}`}>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-2.5 ${currentTheme.forecastText}`}>Pronóstico</p>
            <div className="grid grid-cols-6 gap-1.5">
              {forecast.map((f, i) => {
                const Icon = f.icon
                return (
                  <div key={i} className={`flex flex-col items-center text-center ${currentTheme.forecastCardBg} rounded-lg py-2 px-1 border ${currentTheme.forecastCardBorder} hover:shadow-lg transition-all backdrop-blur-sm`}>
                    <p className={`text-xs font-semibold ${currentTheme.forecastDayText}`}>{f.day}</p>
                    <Icon className={`w-3 h-3 md:w-4 md:h-4 ${currentTheme.forecastIcon} my-1`} />
                    <p className={`text-xs font-bold ${currentTheme.forecastTempText}`}>{f.lo}° / {f.hi}°</p>
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