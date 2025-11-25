"use client"

import { Home, Zap, Thermometer, Droplets, Power } from "lucide-react"
import PageHeader from "../components/UI/PageHeader"
import AnimatedClockWidget from "../components/widgets/AnimatedClockWidget"
import SimpleButton from "../components/UI/Button"
import { useState, useMemo } from "react"
import { useThemeByTime } from "../hooks/useThemeByTime"

interface Device {
  name: string
  location?: string
  power: string
  on: boolean
}

export default function Inicio({
  temperature = 24,
  humidity = 45,
  energyUsage = 320,
  devices = [
    { name: "Luz Sala", location: "Sala", power: "60W", on: true },
    { name: "Aire Acondicionado", location: "Dormitorio", power: "1500W", on: false },
    { name: "Bombilla Cocina", location: "Cocina", power: "40W", on: true },
  ],
}: {
  temperature?: number
  humidity?: number
  energyUsage?: number
  devices?: Device[]
} = {}) {
  const [expandedCard, setExpandedCard] = useState<"energy" | "temp" | "humidity" | "devices" | null>("energy")
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'luz' | 'puerta' | 'ventilador'>('all')
  const { colors, theme } = useThemeByTime()

  // Colores temáticos específicos para cada sección
  const themeConfig = {
    energy: {
      light: {
        bg: "from-emerald-50 to-emerald-100/50",
        ring: "ring-emerald-300",
        accent: "emerald",
        textPrimary: "text-emerald-900",
        textSecondary: "text-emerald-700",
        chart: "#10b981",
      },
      dark: {
        bg: "from-emerald-950/40 to-emerald-900/20",
        ring: "ring-emerald-500",
        accent: "emerald",
        textPrimary: "text-emerald-100",
        textSecondary: "text-emerald-300",
        chart: "#10b981",
      },
    },
    temp: {
      light: {
        bg: "from-orange-50 to-orange-100/50",
        ring: "ring-orange-300",
        accent: "orange",
        textPrimary: "text-orange-900",
        textSecondary: "text-orange-700",
        chart: "#f97316",
      },
      dark: {
        bg: "from-orange-950/40 to-orange-900/20",
        ring: "ring-orange-500",
        accent: "orange",
        textPrimary: "text-orange-100",
        textSecondary: "text-orange-300",
        chart: "#f97316",
      },
    },
    humidity: {
      light: {
        bg: "from-cyan-50 to-cyan-100/50",
        ring: "ring-cyan-300",
        accent: "cyan",
        textPrimary: "text-cyan-900",
        textSecondary: "text-cyan-700",
        chart: "#06b6d4",
      },
      dark: {
        bg: "from-cyan-950/40 to-cyan-900/20",
        ring: "ring-cyan-500",
        accent: "cyan",
        textPrimary: "text-cyan-100",
        textSecondary: "text-cyan-300",
        chart: "#06b6d4",
      },
    },
    devices: {
      light: {
        bg: "from-violet-50 to-violet-100/50",
        ring: "ring-violet-300",
        accent: "violet",
        textPrimary: "text-violet-900",
        textSecondary: "text-violet-700",
        chart: "#8b5cf6",
      },
      dark: {
        bg: "from-violet-950/40 to-violet-900/20",
        ring: "ring-violet-500",
        accent: "violet",
        textPrimary: "text-violet-100",
        textSecondary: "text-violet-300",
        chart: "#8b5cf6",
      },
    },
  }

  const getThemeForSection = (section: "energy" | "temp" | "humidity" | "devices") => {
    return themeConfig[section][theme]
  }

  const energyHistory = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const baseValue = 300 + Math.sin(i * 0.3) * 100
      const variation = Math.random() * 80 - 40
      return Math.max(100, baseValue + variation)
    })
  }, [])

  const temperatureHistory = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const baseValue = 22 + Math.sin(i * 0.4) * 3
      const variation = Math.random() * 2 - 1
      return Math.round((baseValue + variation) * 10) / 10
    })
  }, [])

  const humidityHistory = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const baseValue = 45 + Math.cos(i * 0.3) * 15
      const variation = Math.random() * 10 - 5
      return Math.max(20, Math.min(80, baseValue + variation))
    })
  }, [])

  const activeDevices = devices.filter((d) => d.on).length

  const avgEnergy = Math.round(energyHistory.reduce((a, b) => a + b) / energyHistory.length)
  const avgTemp = Math.round((temperatureHistory.reduce((a, b) => a + b) / temperatureHistory.length) * 10) / 10
  const avgHumidity = Math.round(humidityHistory.reduce((a, b) => a + b) / humidityHistory.length)
  const maxEnergy = Math.max(...energyHistory)
  const minEnergy = Math.min(...energyHistory)
  const maxTemp = Math.max(...temperatureHistory)
  const minTemp = Math.min(...temperatureHistory)

  const getDevicesByFilter = () => {
    const deviceMap: { [key: string]: string[] } = {
      luz: ["Luz", "Bombilla", "Lámpara"],
      puerta: ["Puerta", "Cerradura"],
      ventilador: ["Aire", "Ventilador", "Climatización"],
    }
    if (deviceFilter === "all") return devices
    return devices.filter((d) =>
      deviceMap[deviceFilter]?.some((keyword) => d.name.toLowerCase().includes(keyword.toLowerCase()))
    )
  }

  const filteredDevices = getDevicesByFilter()

  const NavButton = ({ type, label, icon: Icon, value, unit }: {
    type: "energy" | "temp" | "humidity" | "devices"
    label: string
    icon: any
    value: string | number
    unit?: string
  }) => {
    const sectionTheme = getThemeForSection(type)
    const isActive = expandedCard === type

    return (
      <button
        onClick={() => setExpandedCard(type)}
        className={`flex-1 p-4 rounded-lg transition-all text-left backdrop-blur-sm ${
          isActive
            ? `bg-gradient-to-br ${sectionTheme.bg} ring-2 ${sectionTheme.ring} shadow-lg shadow-${sectionTheme.accent}-500/20 ${colors.cardBorder}`
            : `${colors.cardBg} hover:shadow-md`
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${isActive ? sectionTheme.textPrimary : colors.icon}`} />
          <div>
            <h4 className={`font-semibold text-sm ${isActive ? sectionTheme.textPrimary : colors.text}`}>
              {label}
            </h4>
            <p className={`text-xs mt-0.5 ${isActive ? sectionTheme.textSecondary : colors.mutedText}`}>
              {value}{unit}
            </p>
          </div>
        </div>
      </button>
    )
  }

  const renderChart = (type: "energy" | "temp" | "humidity", data: number[]) => {
    const sectionTheme = getThemeForSection(type)
    const chartColor = sectionTheme.chart
    const gradientId = `${type}Gradient`

    if (type === "energy") {
      return (
        <svg viewBox="0 0 1000 300" className="w-full h-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0,1,2,3,4].map(i => (
            <line key={i} x1="50" y1={50 + i*50} x2="950" y2={50 + i*50} stroke={chartColor} strokeWidth="1" opacity="0.1"/>
          ))}
          {data.map((value, i) => {
            const x = 50 + (i / (data.length - 1)) * 900
            const y = 250 - (value / 500) * 200
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="2.5" fill={chartColor} opacity="0.8" />
                {i > 0 && (
                  <line
                    x1={50 + ((i - 1) / (data.length - 1)) * 900}
                    y1={250 - (data[i - 1] / 500) * 200}
                    x2={x} y2={y}
                    stroke={chartColor} strokeWidth="1.5"
                  />
                )}
              </g>
            )
          })}
          <path
            d={`M 50,${250 - (data[0] / 500) * 200} ${data.map((v, i) => `L ${50 + (i / (data.length - 1)) * 900} ${250 - (v / 500) * 200}`).join(" ")} L 950,250 L 50,250 Z`}
            fill={`url(#${gradientId})`}
          />
        </svg>
      )
    }

    if (type === "temp") {
      return (
        <svg viewBox="0 0 1000 300" className="w-full h-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0,1,2,3,4].map(i => (
            <line key={i} x1="50" y1={50 + i*50} x2="950" y2={50 + i*50} stroke={chartColor} strokeWidth="1" opacity="0.1" />
          ))}
          {data.map((v,i)=> {
            const x = 50 + (i/(data.length-1))*900
            const y = 250 - (v/35)*200
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="2.5" fill={chartColor} opacity="0.8" />
                {i>0 && (
                  <line x1={50 + ((i-1)/(data.length-1))*900} y1={250-(data[i-1]/35)*200} x2={x} y2={y} stroke={chartColor} strokeWidth="1.5"/>
                )}
              </g>
            )
          })}
          <path d={`M50,${250-(data[0]/35)*200} ${data.map((v,i)=>`L ${50+(i/(data.length-1))*900} ${250-(v/35)*200}`).join(" ")} L950,250 L50,250 Z`} fill={`url(#${gradientId})`} />
        </svg>
      )
    }

    return (
      <svg viewBox="0 0 1000 300" className="w-full h-full">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.4"/>
            <stop offset="100%" stopColor={chartColor} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0,1,2,3,4].map(i => (
          <line key={i} x1="50" y1={50 + i*50} x2="950" y2={50 + i*50} stroke={chartColor} strokeWidth="1" opacity="0.1"/>
        ))}
        {data.map((v,i)=>{
          const x = 50 + (i/(data.length-1))*900
          const height = (v/100)*200
          const y = 250 - height
          return (
            <g key={i}>
              <rect x={x} y={y} width={10} height={height} fill={`url(#${gradientId})`} rx="4"/>
              <rect x={x} y={y} width={10} height={height} fill="none" stroke={chartColor} strokeWidth="1" opacity="0.5" rx="4"/>
            </g>
          )
        })}
      </svg>
    )
  }

  const renderSection = (type: "energy" | "temp" | "humidity" | "devices") => {
    const sectionTheme = getThemeForSection(type)

    if (type === "energy") {
      return (
        <div className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg backdrop-blur-sm ${colors.cardBg} border border-transparent hover:border-${sectionTheme.accent}-300/30 transition-all`}>
          <div className="flex items-center mb-3">
            <Zap className={`w-5 h-5 ${sectionTheme.textPrimary}`} />
            <div className="ml-2">
              <h3 className={`text-md font-bold ${sectionTheme.textPrimary}`}>Energía</h3>
              <p className={`text-[10px] mt-0.5 ${sectionTheme.textSecondary}`}>Últimas 24 horas</p>
            </div>
          </div>
          <div className={`h-36 md:h-40 flex items-center justify-center mb-3 rounded-lg bg-gradient-to-br ${sectionTheme.bg} p-2 border ${sectionTheme.ring}/20`}>
            {renderChart("energy", energyHistory)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Actual", value: energyUsage },
              { label: "Promedio", value: avgEnergy },
              { label: "Máximo", value: Math.round(maxEnergy) },
              { label: "Mínimo", value: Math.round(minEnergy) },
            ].map((item) => (
              <div key={item.label} className={`p-2 md:p-3 rounded-lg ${colors.cardBg} border ${sectionTheme.ring}/10`}>
                <p className={`text-[10px] ${sectionTheme.textSecondary}`}>{item.label}</p>
                <div className="flex items-center gap-1 md:gap-2">
                  <p className={`text-xl md:text-2xl font-bold ${sectionTheme.textPrimary}`}>{item.value}</p>
                  <span className={`text-[9px] md:text-xs ${sectionTheme.textSecondary}`}>kWh</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (type === "temp") {
      return (
        <div className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg backdrop-blur-sm ${colors.cardBg} border border-transparent hover:border-${sectionTheme.accent}-300/30 transition-all`}>
          <div className="flex items-center mb-3">
            <Thermometer className={`w-5 h-5 ${sectionTheme.textPrimary}`} />
            <div className="ml-2">
              <h3 className={`text-md font-bold ${sectionTheme.textPrimary}`}>Temperatura</h3>
              <p className={`text-[10px] mt-0.5 ${sectionTheme.textSecondary}`}>Últimas 24 horas</p>
            </div>
          </div>
          <div className={`h-36 md:h-40 flex items-center justify-center mb-3 rounded-lg bg-gradient-to-br ${sectionTheme.bg} p-2 border ${sectionTheme.ring}/20`}>
            {renderChart("temp", temperatureHistory)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[{label:"Actual",value:temperature,unit:"°C"},{label:"Promedio",value:avgTemp,unit:"°C"},{label:"Máximo",value:maxTemp,unit:"°C"},{label:"Mínimo",value:minTemp,unit:"°C"}].map(item=>(
              <div key={item.label} className={`p-2 md:p-3 rounded-lg ${colors.cardBg} border ${sectionTheme.ring}/10`}>
                <p className={`text-[10px] ${sectionTheme.textSecondary}`}>{item.label}</p>
                <div className="flex items-center gap-1 md:gap-2">
                  <p className={`text-xl md:text-2xl font-bold ${sectionTheme.textPrimary}`}>{item.value}</p>
                  <span className={`text-[9px] md:text-xs ${sectionTheme.textSecondary}`}>{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (type === "humidity") {
      return (
        <div className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg backdrop-blur-sm ${colors.cardBg} border border-transparent hover:border-${sectionTheme.accent}-300/30 transition-all`}>
          <div className="flex items-center mb-3">
            <Droplets className={`w-5 h-5 ${sectionTheme.textPrimary}`} />
            <div className="ml-2">
              <h3 className={`text-md font-bold ${sectionTheme.textPrimary}`}>Humedad</h3>
              <p className={`text-[10px] mt-0.5 ${sectionTheme.textSecondary}`}>Últimas 24 horas</p>
            </div>
          </div>
          <div className={`h-36 md:h-40 flex items-center justify-center mb-3 rounded-lg bg-gradient-to-br ${sectionTheme.bg} p-2 border ${sectionTheme.ring}/20`}>
            {renderChart("humidity", humidityHistory)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[{label:"Actual",value:humidity,unit:"%"},{label:"Promedio",value:avgHumidity,unit:"%"},{label:"Máximo",value:80,unit:"%"},{label:"Mínimo",value:20,unit:"%"}].map(item=>(
              <div key={item.label} className={`p-2 md:p-3 rounded-lg ${colors.cardBg} border ${sectionTheme.ring}/10`}>
                <p className={`text-[10px] ${sectionTheme.textSecondary}`}>{item.label}</p>
                <div className="flex items-center gap-1 md:gap-2">
                  <p className={`text-xl md:text-2xl font-bold ${sectionTheme.textPrimary}`}>{item.value}</p>
                  <span className={`text-[9px] md:text-xs ${sectionTheme.textSecondary}`}>{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg backdrop-blur-sm ${colors.cardBg} border border-transparent hover:border-${sectionTheme.accent}-300/30 transition-all`}>
        <div className="flex items-center mb-3">
          <Power className={`w-5 h-5 ${sectionTheme.textPrimary}`} />
          <div className="ml-2">
            <h3 className={`text-md font-bold ${sectionTheme.textPrimary}`}>Dispositivos</h3>
            <p className={`text-[10px] mt-0.5 ${sectionTheme.textSecondary}`}>{activeDevices} de {devices.length} activos</p>
          </div>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap">
          {(["all","luz","puerta","ventilador"] as const).map(filter=>(
            <SimpleButton key={filter} onClick={()=>setDeviceFilter(filter)} active={deviceFilter===filter} className="px-3 py-1 text-sm">
              {filter==="all"?"Todos":filter.charAt(0).toUpperCase()+filter.slice(1)}
            </SimpleButton>
          ))}
        </div>

        <div className="space-y-2 mb-2">
          {filteredDevices.length>0 ? filteredDevices.map((d,i)=>(
            <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${colors.cardBg} border ${sectionTheme.ring}/10 hover:border-${sectionTheme.accent}-300/30 transition-all`}>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${sectionTheme.textPrimary}`}>{d.name}</p>
                {d.location && <p className={`text-xs mt-1 ${sectionTheme.textSecondary}`}>{d.location}</p>}
              </div>
              <div className="text-right">
                <p className={`text-xs ${sectionTheme.textSecondary}`}>Consumo</p>
                <p className={`text-sm font-semibold ${sectionTheme.textPrimary}`}>{d.power}</p>
              </div>
              <div className={`w-3 h-3 ml-4 rounded-full shadow-lg transition-all ${d.on ? `bg-${sectionTheme.accent}-400 shadow-${sectionTheme.accent}-400/60` : "bg-slate-400"}`} />
            </div>
          )) : <p className={`text-sm ${sectionTheme.textSecondary}/60`}>No hay dispositivos en esta categoría.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 md:p-6 pt-8 md:pt-4 space-y-6 font-inter ${colors.background} ${colors.text}`}>

      <PageHeader title="Bienvenido" icon={<Home className="w-8 md:w-10 h-8 md:h-10" style={{color: theme === "dark" ? "white" : "currentColor"}} />} />
      <AnimatedClockWidget temperature={temperature} />

      <div>
        <h2 className={`text-sm md:text-base font-bold mb-4 tracking-widest uppercase ${colors.mutedText}`}>
          Resumen del Sistema
        </h2>

        <div className="lg:hidden grid grid-cols-2 gap-3 mb-5">
          <NavButton type="energy" label="Energía" icon={Zap} value={energyUsage} unit=" kWh" />
          <NavButton type="temp" label="Temperatura" icon={Thermometer} value={temperature} unit="°C" />
          <NavButton type="humidity" label="Humedad" icon={Droplets} value={humidity} unit="%" />
          <NavButton type="devices" label="Dispositivos" icon={Power} value={`${activeDevices} activos`} />
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1">
            {expandedCard === "energy" && renderSection("energy")}
            {expandedCard === "temp" && renderSection("temp")}
            {expandedCard === "humidity" && renderSection("humidity")}
            {expandedCard === "devices" && renderSection("devices")}
          </div>

          <div className="hidden lg:block w-full lg:w-80 space-y-4">
            {(["energy", "temp", "humidity", "devices"] as const).map(type => {
              const sectionTheme = getThemeForSection(type)
              const isActive = expandedCard === type
              const config = {
                energy: { label: "Energía", icon: Zap, value: `${energyUsage} kWh usados` },
                temp: { label: "Temperatura", icon: Thermometer, value: `${temperature}°C actuales` },
                humidity: { label: "Humedad", icon: Droplets, value: `${humidity}% actual` },
                devices: { label: "Dispositivos", icon: Power, value: `${activeDevices} activos` },
              }
              const { label, icon: Icon, value } = config[type]

              return (
                <button
                  key={type}
                  onClick={() => setExpandedCard(type)}
                  className={`w-full p-4 rounded-lg cursor-pointer transition-all text-left backdrop-blur-sm ${
                    isActive
                      ? `bg-gradient-to-br ${sectionTheme.bg} ring-2 ${sectionTheme.ring} shadow-lg shadow-${sectionTheme.accent}-500/20`
                      : `${colors.cardBg} hover:shadow-md border border-transparent`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? sectionTheme.textPrimary : colors.icon}`} />
                    <h4 className={`font-semibold text-sm ${isActive ? sectionTheme.textPrimary : colors.text}`}>{label}</h4>
                  </div>
                  <p className={`text-xs mt-1 ${isActive ? sectionTheme.textSecondary : colors.mutedText}`}>{value}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}