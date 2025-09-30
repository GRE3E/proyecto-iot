"use client"

import { useState } from "react"
import { 
  Home, 
  Bell, 
  Thermometer, 
  Zap, 
  Plug, 
  Lightbulb, 
  MapPin, 
  Activity, 
  X,
  Calendar,
  Cloud,
  Sun,
  Snowflake,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// --- Tipos ---
interface Device {
  name: string
  location?: string
  power: string
  on: boolean
}

interface InicioProps {
  temperature?: number
  humidity?: number
  energyUsage?: number
  devices?: Device[]
}

interface Notification {
  id: number
  message: string
}

// --- Componentes mini visuales ---
function Sparkline({ values = [10, 12, 8, 14, 18, 16] }: { values?: number[] }) {
  const max = Math.max(...values)
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 100}`).join(" ")
  return (
    <svg viewBox="0 0 100 100" className="w-24 md:w-32 h-6 md:h-8">
      <polyline fill="none" stroke="#06b6d4" strokeWidth={2} points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Donut({ percent = 65 }: { percent?: number }) {
  const r = 18
  const c = 2 * Math.PI * r
  const dash = (percent / 100) * c
  return (
    <svg viewBox="0 0 48 48" className="w-12 md:w-14 h-12 md:h-14">
      <circle cx="24" cy="24" r={r} fill="transparent" stroke="#0f172a" strokeWidth={6} />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="transparent"
        stroke="#a78bfa"
        strokeWidth={6}
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <text x="24" y="28" textAnchor="middle" fontSize="10" fill="#e6edf3">{percent}%</text>
    </svg>
  )
}

function MiniBars({ values = [20, 40, 60, 50, 80] }: { values?: number[] }) {
  const max = Math.max(...values)
  return (
    <div className="flex items-end gap-1 h-8 md:h-10">
      {values.map((v, i) => (
        <div key={i} style={{ height: `${(v / max) * 100}%` }} className="w-1 md:w-1.5 bg-gradient-to-b from-pink-400 to-rose-400 rounded" />
      ))}
    </div>
  )
}

// Componente simple de reloj animado
function AnimatedClockWidget() {
  const [time, setTime] = useState(new Date())
  
  useState(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  })

  return (
    <div className="text-6xl md:text-8xl font-bold text-white tracking-tight">
      {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
    </div>
  )
}

// Componente para el estado del clima
function WeatherStatus({ temperature }: { temperature: number }) {
  const getWeatherStatus = (temp: number) => {
    if (temp < 15) {
      return {
        icon: <Snowflake className="w-12 h-12 text-blue-300" />,
        label: "Frío",
        gradient: "from-blue-500/20 to-cyan-500/20",
        textColor: "text-blue-300",
        border: "border-blue-500/20"
      }
    } else if (temp >= 15 && temp < 25) {
      return {
        icon: <Cloud className="w-12 h-12 text-gray-300" />,
        label: "Agradable",
        gradient: "from-gray-400/20 to-blue-400/20",
        textColor: "text-gray-300",
        border: "border-gray-400/20"
      }
    } else {
      return {
        icon: <Sun className="w-12 h-12 text-orange-300" />,
        label: "Cálido",
        gradient: "from-orange-500/20 to-yellow-500/20",
        textColor: "text-orange-300",
        border: "border-orange-500/20"
      }
    }
  }

  const { icon, label, gradient, textColor, border } = getWeatherStatus(temperature)

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl bg-gradient-to-r ${gradient} border ${border}`}>
      {icon}
      <div>
        <p className={`text-lg font-semibold ${textColor}`}>{label}</p>
        <p className="text-sm text-slate-300">{temperature}°C</p>
      </div>
    </div>
  )
}

// Componente simple de perfil
function Perfil({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/30 border border-slate-600/20">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
        U
      </div>
      {!compact && <span className="text-sm text-slate-200">Usuario</span>}
    </div>
  )
}

// Componente SimpleCard
function SimpleCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

// Componente de Calendario
function CalendarWidget() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  
  // Obtener el primer día del mes y el número de días en el mes
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  
  // Generar array de días
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  
  // Generar espacios vacíos para el inicio del mes
  const emptyDays = Array(firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1).fill(null)
  
  // Navegación de meses
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

  // Determinar si es el mes actual para resaltar el día actual
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear()
  const currentDay = today.getDate()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg bg-slate-800/30 hover:bg-slate-700/40 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-200" />
        </button>
        <h4 className="text-lg font-semibold text-slate-200">
          {new Date(currentYear, currentMonth).toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
        </h4>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg bg-slate-800/30 hover:bg-slate-700/40 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-200" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {/* Días de la semana */}
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="text-xs font-medium text-slate-400">
            {day}
          </div>
        ))}
        
        {/* Días vacíos al inicio */}
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="h-10" />
        ))}
        
        {/* Días del mes */}
        {days.map((day) => (
          <div
            key={day}
            className={`relative h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 ${
              isCurrentMonth && day === currentDay
                ? "bg-gradient-to-br from-purple-500/30 to-pink-500/30 text-white shadow-lg"
                : "text-slate-400 hover:bg-slate-700/30"
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Inicio({
  temperature = 24,
  humidity = 45,
  energyUsage = 320,
  devices = [
    { name: "Luz Sala", location: "Sala", power: "60W", on: true },
    { name: "Aire Acondicionado", location: "Dormitorio", power: "1500W", on: false },
    { name: "Bombillo Cocina", location: "Cocina", power: "40W", on: true },
  ],
}: InicioProps) {
  // --- Estado notificaciones ---
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, message: "Nueva actualización de seguridad" },
    { id: 2, message: "Sensor de movimiento activado" },
    { id: 3, message: "Consumo de energía elevado detectado" },
  ])

  // Handlers de notificaciones
  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
    setOpen(false)
  }

  const toggleNotifications = () => {
    if (open) {
      setClosing(true)
      setTimeout(() => {
        setOpen(false)
        setClosing(false)
      }, 350)
    } else {
      setOpen(true)
    }
  }  

  return (
    <div className="p-2 md:p-4 space-y-6 md:space-y-8 font-inter">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 md:mb-8 relative">
        <div className="flex items-center gap-4">
          <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/20">
            <Home className="w-8 md:w-10 h-8 md:h-10 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            Bienvenido
          </h2>
        </div>

        {/* --- Perfil + Notificaciones --- */}
        <div className="flex items-center gap-4 relative">
          <div className="w-full md:w-auto">
            <Perfil compact />
          </div>

          {/* Notificaciones */}
          <div className="relative">
            <button
              onClick={toggleNotifications}
              className="relative p-2 md:p-3 rounded-xl bg-slate-800/30 hover:bg-slate-700/40 transition-colors border border-slate-600/20"
            >
              <Bell className="w-5 md:w-6 h-5 md:h-6 text-white" />
              {notifications.length > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="absolute -bottom-1 -right-1 text-xs font-bold text-red-400">
                    {notifications.length}
                  </span>
                </>
              )}
            </button>

            {open && (
              <div
                className={`absolute right-0 mt-3 w-80 bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/40 p-4 z-50 ${
                  closing ? "opacity-0" : "opacity-100"
                } transition-opacity duration-300`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-slate-200 tracking-wide">Notificaciones</h4>
                  <button
                    onClick={clearAll}
                    className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No tienes notificaciones</p>
                ) : (
                  <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className="relative p-3 rounded-lg bg-slate-800/60 border border-slate-700/40 shadow-sm hover:shadow-md transition-all"
                      >
                        <p className="text-sm text-slate-200">{n.message}</p>
                        <button
                          onClick={() => removeNotification(n.id)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Reloj inteligente --- */}
      <div className="mb-6 md:mb-10">
        <div className="max-w-8xl mx-auto">
          <SimpleCard className="p-6 md:p-10 bg-gradient-to-br from-slate-900/70 to-slate-800/50 backdrop-blur-lg border border-white/10 shadow-2xl rounded-3xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              {/* Reloj y Fecha */}
              <div className="flex flex-col items-start text-left">
                <AnimatedClockWidget />
                <p className="mt-4 text-lg md:text-xl font-semibold text-slate-200 tracking-wide">
                  {new Date().toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <span
                  className={`mt-2 px-3 py-1 text-xs rounded-full font-medium ${
                    new Date().getHours() >= 6 && new Date().getHours() < 18
                      ? "bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-300 border border-yellow-500/20"
                      : "bg-gradient-to-r from-indigo-500/20 to-purple-600/20 text-indigo-300 border border-indigo-500/20"
                  }`}
                >
                  {new Date().getHours() >= 6 && new Date().getHours() < 18
                    ? "☀️ Día Activo"
                    : "🌙 Noche Tranquila"}
                </span>
              </div>

              {/* Estado del Clima */}
              <WeatherStatus temperature={temperature} />
            </div>

            {/* Divisor */}
            <div className="flex items-center gap-4 mt-8 mb-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  Calendario
                </h3>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
            </div>

            {/* Calendario */}
            <CalendarWidget />
          </SimpleCard>
        </div>
      </div>

      {/* --- Panel de métricas --- */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-xl md:text-2xl font-semibold text-slate-200 mb-4 font-inter tracking-tight">Panel de métricas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Energía */}
          <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-slate-900/60 to-slate-800/50 backdrop-blur-lg border border-white/5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Energía (24h)</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white font-inter">{energyUsage} kWh</p>
                <p className="text-xs text-slate-500 mt-2">Consumo total reciente</p>
              </div>
              <div className="ml-auto self-center">
                <Sparkline values={[110, 130, 125, 140, 155, 150, energyUsage]} />
              </div>
            </div>
          </SimpleCard>

          {/* Temperatura */}
          <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-violet-900/50 to-indigo-800/40 backdrop-blur-lg border border-white/5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Temperatura</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white font-inter">{temperature}°C</p>
                <p className="text-xs text-slate-500 mt-2">Promedio interior</p>
              </div>
              <div className="ml-auto self-center">
                <Donut percent={Math.round((temperature / 35) * 100)} />
              </div>
            </div>
            <div className="mt-4">
              <MiniBars values={[18, 20, 22, 24, temperature]} />
            </div>
          </SimpleCard>

          {/* Humedad */}
          <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-cyan-900/40 to-sky-800/30 backdrop-blur-lg border border-white/5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Humedad</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white font-inter">{humidity}%</p>
                <p className="text-xs text-slate-500 mt-2">Hogar</p>
              </div>
              <div className="ml-auto self-center">
                <Donut percent={Math.round(humidity)} />
              </div>
            </div>
            <div className="mt-4">
              <Sparkline values={[40, 42, 43, 44, humidity]} />
            </div>
          </SimpleCard>

          {/* Dispositivos */}
          <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-rose-900/30 to-pink-800/30 backdrop-blur-lg border border-white/5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Dispositivos</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white font-inter">{devices.filter((d) => d.on).length}/{devices.length}</p>
                <p className="text-xs text-slate-500 mt-2">Estado activos</p>
              </div>
              <div className="ml-auto self-center">
                <MiniBars values={devices.map((d) => (d.on ? 100 : 20))} />
              </div>
            </div>
          </SimpleCard>
        </div>
      </div>

      {/* --- Devices --- */}
      <div className="space-y-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-slate-600/20 to-slate-700/20 backdrop-blur-sm">
            <Activity className="w-5 md:w-6 h-5 md:h-6 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-semibold text-slate-200 font-inter tracking-tight">Dispositivos</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-600/50 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {devices.map((device, i) => (
            <SimpleCard
              key={i}
              className="p-4 md:p-6 hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden border-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm"
            >
              <div
                className={`absolute top-4 right-4 w-3 h-3 rounded-full transition-all duration-300 ${
                  device.on
                    ? "bg-green-500 shadow-lg shadow-green-500/50 animate-pulse"
                    : "bg-red-500/70 shadow-lg shadow-red-500/30"
                }`}
              />

              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                  device.on
                    ? "bg-gradient-to-br from-green-500/5 to-emerald-500/5"
                    : "bg-gradient-to-br from-red-500/5 to-rose-500/5"
                }`}
              />

              <div className="relative space-y-4">
                <div className="flex items-start gap-3 md:gap-4">
                  <div
                    className={`p-2 md:p-3 rounded-xl transition-all duration-300 backdrop-blur-sm ${
                      device.on
                        ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 group-hover:from-green-500/30 group-hover:to-emerald-500/30"
                        : "bg-gradient-to-br from-slate-600/20 to-slate-700/20 group-hover:from-slate-600/30 group-hover:to-slate-700/30"
                    }`}
                  >
                    {device.name.includes("Luz") || device.name.includes("Bombillo") ? (
                      <Lightbulb className="w-5 md:w-6 h-5 md:h-6 text-white" />
                    ) : device.name.includes("Aire") ? (
                      <Thermometer className="w-5 md:w-6 h-5 md:h-6 text-white" />
                    ) : (
                      <Plug className="w-5 md:w-6 h-5 md:h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-slate-200 group-hover:text-white transition-colors duration-300 truncate font-inter">
                      {device.name}
                    </h3>
                    <p
                      className={`text-sm font-medium transition-colors duration-300 ${
                        device.on ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {device.on ? "Encendido" : "Apagado"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-slate-600/30 group-hover:border-slate-500/50 transition-colors duration-300">
                  {device.location && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                      <MapPin className="w-3.5 h-3.5" />
                      {device.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                    <Zap className="w-3.5 h-3.5" />
                    {device.power}
                  </div>
                </div>
              </div>
            </SimpleCard>
          ))}
        </div>
      </div>
    </div>
  )
}


