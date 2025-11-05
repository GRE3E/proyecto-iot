  "use client"

import { useState, useEffect } from "react"
import SimpleCard from "../UI/Card"
import { Clock, Cloud, Sun, CloudRain } from "lucide-react"
import { getWeatherData, generateParticles, updateParticles } from "../../utils/widgetUtils"
import { generateSparklinePoints } from "../../utils/chatUtils"

// Custom animations for weather effects
const weatherAnimations = `
  @keyframes fall {
    0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
  }
  @keyframes heat-wave {
    0% { transform: scaleY(1) opacity: 0.8; }
    50% { transform: scaleY(1.2) opacity: 0.4; }
    100% { transform: scaleY(1) opacity: 0.8; }
  }
  @keyframes float-gentle {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    25% { transform: translateY(-5px) rotate(1deg); }
    50% { transform: translateY(-10px) rotate(-1deg); }
    75% { transform: translateY(-5px) rotate(1deg); }
  }
  .animate-fall { animation: fall linear infinite; }
  .animate-heat-wave { animation: heat-wave ease-in-out infinite; }
  .animate-float-gentle { animation: float-gentle ease-in-out infinite; }
`;

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

export default function AnimatedClockWidget({ temperature }: { temperature?: number }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [realTemperature, setRealTemperature] = useState(temperature || 22)
  const [weatherCondition, setWeatherCondition] = useState('Cloudy') // Default condition

  // Fetch real weather data
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            const response = await fetch(`https://wttr.in/${latitude},${longitude}?format=j1`)
            const data = await response.json()
            const temp = parseInt(data.current_condition[0].temp_C)
            const condition = data.current_condition[0].weatherDesc[0].value // e.g., "Sunny", "Cloudy"
            setRealTemperature(temp)
            setWeatherCondition(condition)
          } catch (error) {
            console.error('Error fetching weather:', error)
            // Fallback to provided temperature or default
          }
        },
        (error) => {
          console.error('Error getting location:', error)
          // Fallback to provided temperature or default
        }
      )
    }
  }, [])

  const weather = getWeatherData(realTemperature, weatherCondition)
  // mock extra metrics (replace with real API if available)
  const humidity = Math.max(10, Math.min(90, Math.round(50 + (Math.sin(Date.now() / 60000) * 10))))
  const wind = Math.max(0, Math.round(5 + (Math.cos(Date.now() / 90000) * 3)))
  const tempHistory = [realTemperature - 2, realTemperature - 1, realTemperature - 1, realTemperature, realTemperature + 1, realTemperature] // mock
  const sparkPoints = generateSparklinePoints(tempHistory.map((t) => Math.round(t)))

  // mock forecast (could be replaced with real API data)
  const forecast = [
    { day: "LUN", icon: Cloud , hi: 30, lo: 21 },
    { day: "MAR", icon: Sun, hi: 32, lo: 22 },
    { day: "MIER", icon: Sun, hi: 31, lo: 21 },
    { day: "JUV", icon: CloudRain, hi: 28, lo: 20 },
    { day: "VIE", icon: Sun, hi: 30, lo: 21 },
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
  <>
    <style dangerouslySetInnerHTML={{ __html: weatherAnimations }} />
    <SimpleCard className="relative pl-2 pr-6 pt-6 pb-6 md:pl-3 md:pr-8 md:pt-8 md:pb-8 bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/40 shadow-2xl rounded-2xl overflow-hidden min-h-[260px] md:min-h-[300px]">
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
  <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,400px)_1fr] items-center gap-4 md:gap-8 w-full">
    {/* Left: Time big + small analog (centrado dentro de su columna) */}
    <div className="flex flex-col items-center justify-center gap-4 h-full">
            <div className="text-4xl md:text-6xl lg:text-7xl font-bold text-white font-mono tracking-wider">{currentTime.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="relative w-32 h-32 md:w-44 md:h-44 lg:w-48 lg:h-48 rounded-full border-2 border-slate-500/30 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm shadow-inner">
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180
                const numberX = 50 + 38 * Math.sin(angle)
                const numberY = 50 - 38 * Math.cos(angle)
                const number = i === 0 ? 12 : i
                return (
                  <div key={i} className="absolute text-cyan-300 text-base font-black font-mono" style={{ left: `${numberX}%`, top: `${numberY}%`, transform: "translate(-50%, -50%)", textShadow: "0 0 5px #06b6d4" }}>{number}</div>
                )
              })}
              <div className="absolute bg-cyan-300 rounded-full" style={{ width: "2px", height: "34%", bottom: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${hourDeg}deg)` }} />
              <div className="absolute bg-white rounded-full" style={{ width: "1.2px", height: "35%", bottom: "50%", left: "50%", transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${minuteDeg}deg)` }} />
            </div>
            <div className="text-base text-slate-300">{currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>

          {/* Right: Weather card (inline, centrado) */}
          <div className="w-full">
            <div className="relative rounded-2xl bg-gradient-to-br from-blue-800/40 via-purple-800/25 to-cyan-800/40 border-2 border-cyan-400/20 p-4 shadow-lg h-full flex flex-col justify-center items-center text-center overflow-hidden">
              {/* Temperature display at top left */}
              <div className="absolute top-2 left-2 text-white text-xl font-bold z-20">
                {realTemperature}ºC
              </div>
              <div className="flex flex-col items-center gap-4 w-full relative z-10">
                {weather.label === "Agradable" ? (
                  <>
                    <div className="flex flex-col items-center gap-2 w-full relative z-10">
                      <Cloud className="w-6 h-6 text-slate-200" />
                      <div className="text-xs md:text-sm text-cyan-200/70 italic">{weather.advice}</div>
                      <div className="text-xs text-slate-300">Humedad: <span className="text-cyan-200 font-semibold">{humidity}%</span> · Viento: <span className="text-cyan-200 font-semibold">{wind} km/h</span></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-2 w-full relative z-10">
                      <div className="text-base md:text-lg font-semibold text-white">{weather.label}</div>
                      <div className="text-xs md:text-sm text-cyan-200/70 italic">{weather.advice}</div>
                      <div className="text-xs text-slate-300">Humedad: <span className="text-cyan-200 font-semibold">{humidity}%</span> · Viento: <span className="text-cyan-200 font-semibold">{wind} km/h</span></div>
                    </div>
                  </>
                )}
              </div>

              {/* Weather-specific animations based on actual weather condition and temperature */}
              {(realTemperature < 10 || weatherCondition.toLowerCase().includes('snow')) && (
                <div className="absolute inset-0 pointer-events-none opacity-50 z-0">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute text-cyan-200 text-lg animate-fall"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `-10px`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${4 + Math.random() * 3}s`
                      }}
                    >
                      ❄️
                    </div>
                  ))}
                </div>
              )}
              {(realTemperature > 25 || weatherCondition.toLowerCase().includes('sunny')) && (
                <div className="absolute inset-0 pointer-events-none opacity-50 z-0">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute text-yellow-300 text-lg animate-float-gentle"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 4}s`,
                        animationDuration: `${5 + Math.random() * 3}s`
                      }}
                    >
                      ☀️
                    </div>
                  ))}
                </div>
              )}
              {(weatherCondition.toLowerCase().includes('cloud') || weatherCondition.toLowerCase().includes('overcast')) && (
                <div className="absolute inset-0 pointer-events-none opacity-50 z-0">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute text-green-300 text-sm animate-float-gentle"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 4}s`,
                        animationDuration: `${5 + Math.random() * 3}s`
                      }}
                    >
                      🍃
                    </div>
                  ))}
                </div>
              )}
              {(weatherCondition.toLowerCase().includes('rain') || weatherCondition.toLowerCase().includes('shower')) && (
                <div className="absolute inset-0 pointer-events-none opacity-50 z-0">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute text-blue-300 text-lg animate-fall"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `-10px`,
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${2 + Math.random() * 2}s`
                      }}
                    >
                      💧
                    </div>
                  ))}
                </div>
              )}
              {(weatherCondition.toLowerCase().includes('fog') || weatherCondition.toLowerCase().includes('mist')) && (
                <div className="absolute inset-0 pointer-events-none opacity-30 bg-gray-400/20 blur-sm z-0" />
              )}

              <div className="mt-2 mb-1 w-full relative z-10">
                <div className="grid grid-cols-6 gap-1 md:gap-2 text-xs md:text-sm text-slate-200">
                  {forecast.map((f, i) => {
                    const Icon = f.icon as any
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div className="text-cyan-200/70 text-xs md:text-sm">{f.day}</div>
                        <div className="mt-0.5"><Icon className="w-4 h-4 md:w-6 md:h-6 text-slate-200" /></div>
                        <div className="mt-0.5 font-medium text-xs md:text-sm">{f.lo}° / {f.hi}°</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SimpleCard>
  </>
  )
}
