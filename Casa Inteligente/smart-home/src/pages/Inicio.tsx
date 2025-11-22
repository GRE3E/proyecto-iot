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
  const iconColor = theme === "light" ? "text-slate-800" : "text-white"

  // Datos históricos simulados (100% intactos)
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

  // Botón común reutilizable para móvil y desktop
  const NavButton = ({ type, label, icon: Icon, value, unit }: {
    type: "energy" | "temp" | "humidity" | "devices"
    label: string
    icon: any
    value: string | number
    unit?: string
  }) => (
    <button
      onClick={() => setExpandedCard(type)}
      className={`flex-1 p-4 rounded-lg transition-all text-left ${
        expandedCard === type
          ? type === "energy" ? "bg-emerald-950/70 ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20"
          : type === "temp" ? "bg-orange-950/70 ring-2 ring-orange-500 shadow-lg shadow-orange-500/20"
          : type === "humidity" ? "bg-cyan-950/70 ring-2 ring-cyan-500 shadow-lg shadow-cyan-500/20"
          : "bg-violet-950/70 ring-2 ring-violet-500 shadow-lg shadow-violet-500/20"
          : `${colors.cardBg} hover:bg-white/5`
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${expandedCard === type ? "text-white" : iconColor}`} />
        <div>
          <h4 className={`font-semibold text-sm ${expandedCard === type ? "text-white" : colors.text}`}>
            {label}
          </h4>
          <p className={`text-xs mt-0.5 ${expandedCard === type ? "text-white/80" : colors.mutedText}`}>
            {value}{unit}
          </p>
        </div>
      </div>
    </button>
  )

  return (
    <div className={`p-4 md:p-6 pt-8 md:pt-4 space-y-6 font-inter ${colors.background} ${colors.text}`}>

      <PageHeader title="Bienvenido" icon={<Home className="w-8 md:w-10 h-8 md:h-10 text-white" />} />
      <AnimatedClockWidget temperature={temperature} />

      <div>
        <h2 className={`text-sm md:text-base font-bold mb-4 tracking-widest uppercase ${colors.mutedText}`}>
          Resumen del Sistema
        </h2>

        {/* BOTONES EN MÓVIL (arriba del gráfico) */}
        <div className="lg:hidden grid grid-cols-2 gap-3 mb-5">
          <NavButton type="energy" label="Energía" icon={Zap} value={energyUsage} unit=" kWh" />
          <NavButton type="temp" label="Temperatura" icon={Thermometer} value={temperature} unit="°C" />
          <NavButton type="humidity" label="Humedad" icon={Droplets} value={humidity} unit="%" />
          <NavButton type="devices" label="Dispositivos" icon={Power} value={`${activeDevices} activos`} />
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* PANEL PRINCIPAL - GRÁFICO EXPANDIDO */}
          <div className="flex-1">

            {/* Energía */}
            {expandedCard === "energy" && (
              <div className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg ${colors.cardBg}`}>
                <div className="flex items-center mb-3">
                  <Zap className={`w-5 h-5 ${iconColor}`} />
                  <div className="ml-2">
                    <h3 className={`text-md font-bold ${colors.text}`}>Energía</h3>
                    <p className={`text-[10px] mt-0.5 ${colors.mutedText}`}>Últimas 24 horas</p>
                  </div>
                </div>
                {/* ... (gráfico de energía igual que antes) */}
                <div className={`h-36 md:h-40 flex items-center justify-center mb-3 rounded-lg ${colors.cardBg} p-2`}>
                  <svg viewBox="0 0 1000 300" className="w-full h-full">
                    <defs>
                      <linearGradient id="energyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0,1,2,3,4].map(i => (
                      <line key={i} x1="50" y1={50 + i*50} x2="950" y2={50 + i*50} stroke="#10b981" strokeWidth="1" opacity="0.1"/>
                    ))}
                    {energyHistory.map((value, i) => {
                      const x = 50 + (i / (energyHistory.length - 1)) * 900
                      const y = 250 - (value / 500) * 200
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="2.5" fill="#10b981" opacity="0.8" />
                          <line
                            x1={i > 0 ? 50 + ((i - 1) / (energyHistory.length - 1)) * 900 : x}
                            y1={i > 0 ? 250 - (energyHistory[i - 1] / 500) * 200 : y}
                            x2={x} y2={y}
                            stroke="#10b981" strokeWidth="1.5"
                          />
                        </g>
                      )
                    })}
                    <path
                      d={`M 50,${250 - (energyHistory[0] / 500) * 200} ${energyHistory.map((v, i) => `L ${50 + (i / (energyHistory.length - 1)) * 900} ${250 - (v / 500) * 200}`).join(" ")} L 950,250 L 50,250 Z`}
                      fill="url(#energyGradient)"
                    />
                  </svg>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { label: "Actual", value: energyUsage },
                    { label: "Promedio", value: avgEnergy },
                    { label: "Máximo", value: Math.round(maxEnergy) },
                    { label: "Mínimo", value: Math.round(minEnergy) },
                  ].map((item) => (
                    <div key={item.label} className={`p-2 md:p-3 rounded-lg ${colors.cardBg}`}>
                      <p className={`text-[10px] ${colors.text}`}>{item.label}</p>
                      <div className="flex items-center gap-1 md:gap-2">
                        <p className={`text-xl md:text-2xl font-bold ${colors.text}`}>{item.value}</p>
                        <span className={`text-[9px] md:text-xs px-1.5 py-0.5 rounded ${colors.text}`}>kWh</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Temperatura, Humedad y Dispositivos siguen igual (solo copio uno como ejemplo para no alargar) */}
            {expandedCard === "temp" && (
              <div className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg ${colors.cardBg}`}>
                <div className="flex items-center mb-3">
                  <Thermometer className={`w-5 h-5 ${iconColor}`} />
                  <div className="ml-2">
                    <h3 className={`text-md font-bold ${colors.text}`}>Temperatura</h3>
                    <p className={`text-[10px] mt-0.5 ${colors.mutedText}`}>Últimas 24 horas</p>
                  </div>
                </div>
                <div className={`h-36 md:h-40 flex items-center justify-center mb-3 rounded-lg ${colors.cardBg} p-2`}>
                  <svg viewBox="0 0 1000 300" className="w-full h-full">
                    <defs>
                      <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0,1,2,3,4].map(i => (
                      <line key={i} x1="50" y1={50 + i*50} x2="950" y2={50 + i*50} stroke="#f97316" strokeWidth="1" opacity="0.1" />
                    ))}
                    {temperatureHistory.map((v,i)=> {
                      const x = 50 + (i/(temperatureHistory.length-1))*900
                      const y = 250 - (v/35)*200
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="2.5" fill="#fed7aa" opacity="0.8" />
                          {i>0 && (
                            <line x1={50 + ((i-1)/(temperatureHistory.length-1))*900} y1={250-(temperatureHistory[i-1]/35)*200} x2={x} y2={y} stroke="#f97316" strokeWidth="1.5"/>
                          )}
                        </g>
                      )
                    })}
                    <path d={`M50,${250-(temperatureHistory[0]/35)*200} ${temperatureHistory.map((v,i)=>`L ${50+(i/(temperatureHistory.length-1))*900} ${250-(v/35)*200}`).join(" ")} L950,250 L50,250 Z`} fill="url(#tempGradient)" />
                  </svg>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[{label:"Actual",value:temperature,unit:"°C"},{label:"Promedio",value:avgTemp,unit:"°C"},{label:"Máximo",value:maxTemp,unit:"°C"},{label:"Mínimo",value:minTemp,unit:"°C"}].map(item=>(
                    <div key={item.label} className={`p-2 md:p-3 rounded-lg ${colors.cardBg}`}>
                      <p className={`text-[10px] ${colors.text}`}>{item.label}</p>
                      <div className="flex items-center gap-1 md:gap-2">
                        <p className={`text-xl md:text-2xl font-bold ${colors.text}`}>{item.value}</p>
                        <span className={`text-[9px] md:text-xs px-1.5 py-0.5 rounded ${colors.text}`}>{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Humedad y Dispositivos se mantienen exactamente igual que en tu código original */}
            {expandedCard === "humidity" && (
              <div className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg ${colors.cardBg}`}>
                <div className="flex items-center mb-3">
                  <Droplets className={`w-5 h-5 ${iconColor}`} />
                  <div className="ml-2">
                    <h3 className={`text-md font-bold ${colors.text}`}>Humedad</h3>
                    <p className={`text-[10px] mt-0.5 ${colors.mutedText}`}>Últimas 24 horas</p>
                  </div>
                </div>
                <div className={`h-36 md:h-40 flex items-center justify-center mb-3 rounded-lg ${colors.cardBg} p-2`}>
                  <svg viewBox="0 0 1000 300" className="w-full h-full">
                    <defs>
                      <linearGradient id="humidityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {[0,1,2,3,4].map(i => (
                      <line key={i} x1="50" y1={50 + i*50} x2="950" y2={50 + i*50} stroke="#06b6d4" strokeWidth="1" opacity="0.1"/>
                    ))}
                    {humidityHistory.map((v,i)=>{
                      const x = 50 + (i/(humidityHistory.length-1))*900
                      const height = (v/100)*200
                      const y = 250 - height
                      return (
                        <g key={i}>
                          <rect x={x} y={y} width={10} height={height} fill="url(#humidityGradient)" rx="4"/>
                          <rect x={x} y={y} width={10} height={height} fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.5" rx="4"/>
                        </g>
                      )
                    })}
                  </svg>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[{label:"Actual",value:humidity,unit:"%"},{label:"Promedio",value:avgHumidity,unit:"%"},{label:"Máximo",value:80,unit:"%"},{label:"Mínimo",value:20,unit:"%"}].map(item=>(
                    <div key={item.label} className={`p-2 md:p-3 rounded-lg ${colors.cardBg}`}>
                      <p className={`text-[10px] ${colors.text}`}>{item.label}</p>
                      <div className="flex items-center gap-1 md:gap-2">
                        <p className={`text-xl md:text-2xl font-bold ${colors.text}`}>{item.value}</p>
                        <span className={`text-[9px] md:text-xs px-1.5 py-0.5 rounded ${colors.text}`}>{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedCard === "devices" && (
              <div className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg ${colors.cardBg}`}>
                <div className="flex items-center mb-3">
                  <Power className={`w-5 h-5 ${iconColor}`} />
                  <div className="ml-2">
                    <h3 className={`text-md font-bold ${colors.text}`}>Dispositivos</h3>
                    <p className={`text-[10px] mt-0.5 ${colors.mutedText}`}>{activeDevices} de {devices.length} activos</p>
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
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${colors.cardBg}`}>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${colors.text}`}>{d.name}</p>
                        {d.location && <p className={`text-xs mt-1 ${colors.mutedText}`}>{d.location}</p>}
                      </div>
                      <div className="text-right">
                        <p className={`text-xs ${colors.mutedText}`}>Consumo</p>
                        <p className={`text-sm font-semibold ${colors.text}`}>{d.power}</p>
                      </div>
                      <div className="w-3 h-3 ml-4 rounded-full shadow-lg transition-all" style={{background:d.on?"#10ffb3":"#888", boxShadow:d.on?"0 0 8px #10ffb3":"none"}} />
                    </div>
                  )) : <p className="text-sm text-violet-300/60">No hay dispositivos en esta categoría.</p>}
                </div>
              </div>
            )}
          </div>

          {/* TARJETAS LATERALES SOLO EN ESCRITORIO */}
          <div className="hidden lg:block w-full lg:w-80 space-y-4">
            <div onClick={() => setExpandedCard("energy")} className={`p-4 rounded-lg cursor-pointer transition-all ${expandedCard === "energy" ? "bg-emerald-950/70 ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20" : `${colors.cardBg} hover:bg-white/5`}`}>
              <div className="flex items-center gap-3">
                <Zap className={`w-5 h-5 ${expandedCard === "energy" ? "text-emerald-300" : iconColor}`} />
                <h4 className={`font-semibold text-sm ${expandedCard === "energy" ? "text-emerald-100" : colors.text}`}>Energía</h4>
              </div>
              <p className={`text-xs mt-1 ${expandedCard === "energy" ? "text-emerald-200" : colors.mutedText}`}>{energyUsage} kWh usados</p>
            </div>

            <div onClick={() => setExpandedCard("temp")} className={`p-4 rounded-lg cursor-pointer transition-all ${expandedCard === "temp" ? "bg-orange-950/70 ring-2 ring-orange-500 shadow-lg shadow-orange-500/20" : `${colors.cardBg} hover:bg-white/5`}`}>
              <div className="flex items-center gap-3">
                <Thermometer className={`w-5 h-5 ${expandedCard === "temp" ? "text-orange-300" : iconColor}`} />
                <h4 className={`font-semibold text-sm ${expandedCard === "temp" ? "text-orange-100" : colors.text}`}>Temperatura</h4>
              </div>
              <p className={`text-xs mt-1 ${expandedCard === "temp" ? "text-orange-200" : colors.mutedText}`}>{temperature}°C actuales</p>
            </div>

            <div onClick={() => setExpandedCard("humidity")} className={`p-4 rounded-lg cursor-pointer transition-all ${expandedCard === "humidity" ? "bg-cyan-950/70 ring-2 ring-cyan-500 shadow-lg shadow-cyan-500/20" : `${colors.cardBg} hover:bg-white/5`}`}>
              <div className="flex items-center gap-3">
                <Droplets className={`w-5 h-5 ${expandedCard === "humidity" ? "text-cyan-300" : iconColor}`} />
                <h4 className={`font-semibold text-sm ${expandedCard === "humidity" ? "text-cyan-100" : colors.text}`}>Humedad</h4>
              </div>
              <p className={`text-xs mt-1 ${expandedCard === "humidity" ? "text-cyan-200" : colors.mutedText}`}>{humidity}% actual</p>
            </div>

            <div onClick={() => setExpandedCard("devices")} className={`p-4 rounded-lg cursor-pointer transition-all ${expandedCard === "devices" ? "bg-violet-950/70 ring-2 ring-violet-500 shadow-lg shadow-violet-500/20" : `${colors.cardBg} hover:bg-white/5`}`}>
              <div className="flex items-center gap-3">
                <Power className={`w-5 h-5 ${expandedCard === "devices" ? "text-violet-300" : iconColor}`} />
                <h4 className={`font-semibold text-sm ${expandedCard === "devices" ? "text-violet-100" : colors.text}`}>Dispositivos</h4>
              </div>
              <p className={`text-xs mt-1 ${expandedCard === "devices" ? "text-violet-200" : colors.mutedText}`}>{activeDevices} activos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}