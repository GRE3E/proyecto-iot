"use client"

import { useState, useEffect } from "react"
import SimpleCard from "../UI/Card"
import { Sun, Cloud, CloudRain } from "lucide-react"
import { getWeatherData } from "../../utils/widgetUtils"
import { useZonaHoraria } from "../../hooks/useZonaHoraria"
import { useThemeByTime } from "../../hooks/useThemeByTime"

export default function AnimatedClockWidget({ temperature }: { temperature?: number }) {
  const { selectedTimezone, currentTime, currentDate } = useZonaHoraria()
  const { theme, colors } = useThemeByTime()
  const [realTemperature, setRealTemperature] = useState(temperature || 22)
  const [weatherCondition, setWeatherCondition] = useState('Cloudy')

  useEffect(() => {
    const fetchWeather = async () => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by your browser.')
        setRealTemperature(22) // Default temperature
        setWeatherCondition('Unknown') // Default condition
        return
      }

      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' })

        if (permissionStatus.state === 'denied') {
          console.warn('Geolocation permission denied. Using default weather.')
          setRealTemperature(22) // Default temperature
          setWeatherCondition('Unknown') // Default condition
          return
        }

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
              setRealTemperature(22) // Fallback temperature
              setWeatherCondition('Unknown') // Fallback condition
            }
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              console.warn('Geolocation permission denied. Using default weather.')
            } else {
              console.error('Error getting location:', error)
            }
            setRealTemperature(22) // Fallback temperature
            setWeatherCondition('Unknown') // Fallback condition
          }
        )
      } catch (error) {
        console.error('Error querying geolocation permission:', error)
        setRealTemperature(22) // Fallback temperature
        setWeatherCondition('Unknown') // Fallback condition
      }
    }

    fetchWeather()
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
    <SimpleCard className={`relative overflow-hidden bg-gradient-to-br ${colors.clockBg} border ${colors.clockBorder} p-5 md:p-6 backdrop-blur-md shadow-xl`}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.8fr] gap-5 md:gap-6">
        
        {/* Left: Clock & Date */}
        <div className="flex flex-col items-center justify-center">
          <div className={`text-4xl md:text-5xl font-bold font-mono tracking-wider mb-3 ${colors.text}`}>
            {currentTime || "00:00"}
          </div>
          
          <div className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full border-2 ${colors.clockBorder} flex items-center justify-center bg-gradient-to-b ${colors.clockBg} shadow-inner`}>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180
              const numberX = 50 + 36 * Math.sin(angle)
              const numberY = 50 - 36 * Math.cos(angle)
              const number = i === 0 ? 12 : i
              return (
                <div 
                  key={i} 
                  className={`absolute text-xs font-bold font-mono ${colors.clockNumbers}`} 
                  style={{ left: `${numberX}%`, top: `${numberY}%`, transform: "translate(-50%, -50%)" }}
                >
                  {number}
                </div>
              )
            })}
            <div 
              className={`absolute rounded-full ${colors.clockHourHand}`} 
              style={{ 
                width: "2px", 
                height: "32%", 
                bottom: "50%", 
                left: "50%", 
                transformOrigin: "bottom center", 
                transform: `translateX(-50%) rotate(${hourDeg}deg)`, 
                boxShadow: "0 0 4px currentColor" 
              }} 
            />
            <div 
              className={`absolute rounded-full ${colors.clockMinuteHand}`} 
              style={{ 
                width: "1px", 
                height: "36%", 
                bottom: "50%", 
                left: "50%", 
                transformOrigin: "bottom center", 
                transform: `translateX(-50%) rotate(${minuteDeg}deg)`, 
                boxShadow: "0 0 3px currentColor" 
              }} 
            />
            <div className={`absolute w-2 h-2 ${colors.clockCenter} rounded-full shadow-lg`} />
          </div>
          
          <div className={`text-xs font-medium mt-3 ${colors.dateText}`}>
            {currentDate || new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          
          {selectedTimezone && (
            <div className={`text-xs mt-2 ${colors.timezoneText}`}>
              {selectedTimezone.region} • {selectedTimezone.offset}
            </div>
          )}
        </div>

        {/* Right: Weather */}
        <div className={`rounded-xl bg-gradient-to-br ${colors.weatherBg} border ${colors.weatherBorder} p-4 md:p-5 flex flex-col justify-between backdrop-blur-sm`}>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium mb-1 ${colors.weatherLabel}`}>Clima</p>
                <p className={`text-lg md:text-xl font-bold ${colors.weatherAdvice}`}>{weather.label}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl md:text-3xl font-bold ${colors.weatherTemperature}`}>{realTemperature}°C</p>
              </div>
            </div>
            
            <p className={`text-xs md:text-sm italic leading-relaxed ${colors.weatherAdvice}`}>{weather.advice}</p>
            
            <div className="flex gap-3 mt-2">
              <div className={`flex-1 flex items-center gap-2 bg-gradient-to-r ${theme === "light" ? "from-blue-400/15 to-cyan-400/10" : "from-cyan-500/10 to-blue-500/5"} rounded-lg px-3 py-2 border ${colors.weatherBorder}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider ${colors.weatherHumidity}`}>{humidity}%</div>
              </div>
              <div className={`flex-1 flex items-center gap-2 bg-gradient-to-r ${theme === "light" ? "from-blue-400/15 to-cyan-400/10" : "from-cyan-500/10 to-blue-500/5"} rounded-lg px-3 py-2 border ${colors.weatherBorder}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider ${colors.weatherWind}`}>{wind} km/h</div>
              </div>
            </div>
          </div>

          {/* Forecast */}
          <div className={`mt-3 pt-3 border-t ${colors.forecastBorder}`}>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-2.5 ${colors.text}`}>Pronóstico</p>
            <div className="grid grid-cols-6 gap-1.5">
              {forecast.map((f, i) => {
                const Icon = f.icon
                return (
                  <div 
                    key={i} 
                    className={`flex flex-col items-center text-center ${colors.forecastCardBg} rounded-lg py-2 px-1 border ${colors.forecastCardBorder} hover:shadow-lg transition-all backdrop-blur-sm`}
                  >
                    <p className={`text-xs font-semibold ${colors.forecastDay}`}>{f.day}</p>
                    <Icon className={`w-3 h-3 md:w-4 md:h-4 ${colors.forecastIcon} my-1`} />
                    <p className={`text-xs font-bold ${colors.forecastTemp}`}>{f.lo}° / {f.hi}°</p>
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