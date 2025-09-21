"use client"

import AnimatedClockWidget from "../widgets/AnimatedClockWidget"
import SimpleCard from "../UI/SimpleCard"
import HouseModel3D from "../../HouseModel3D"
import LiquidGauge from "../widgets/LiquidGauge"

// Tipos
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
  lightOn?: boolean
  securityOn?: boolean
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
  lightOn = true,
  securityOn = true,
}: InicioProps) {
  return (
    <div className="p-4 space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/20">
          <span className="text-4xl">🏡</span>
        </div>
        <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          Bienvenido
        </h2>
      </div>

      {/* --- Notificaciones y reloj --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="hover:scale-[1.02] transition-all duration-300">
          <AnimatedClockWidget />
        </div>

        <SimpleCard className="p-6 hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-300 backdrop-blur-sm">
                <span className="text-2xl">🔔</span>
              </div>
              <h2 className="text-xl font-semibold text-cyan-400">Notificaciones</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
              <p className="text-slate-300">No tienes nuevas notificaciones.</p>
            </div>
          </div>
        </SimpleCard>

        <SimpleCard className="p-6 hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 group-hover:from-yellow-500/30 group-hover:to-orange-500/30 transition-all duration-300 backdrop-blur-sm">
                <span className="text-2xl">💡</span>
              </div>
              <h2 className="text-xl font-semibold text-yellow-400">Estado de luces</h2>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {Array.from({ length: devices.length }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        i < devices.filter((d) => d.on).length
                          ? "bg-green-500 shadow-lg shadow-green-500/50 animate-pulse"
                          : "bg-slate-600/50"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-yellow-400 tabular-nums">{devices.filter((d) => d.on).length}</p>
                <p className="text-sm text-slate-400">de {devices.length} activas</p>
              </div>
            </div>
          </div>
        </SimpleCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="hover:scale-[1.02] transition-all duration-300 hover:z-10 relative">
          <LiquidGauge value={temperature} maxValue={35} label="Temperatura" color="#06b6d4" icon="🌡️" unit="°C" />
        </div>
        <div className="hover:scale-[1.02] transition-all duration-300 hover:z-10 relative">
          <LiquidGauge value={humidity} maxValue={100} label="Humedad" color="#a855f7" icon="💧" unit="%" />
        </div>
        <div className="hover:scale-[1.02] transition-all duration-300 hover:z-10 relative">
          <LiquidGauge value={energyUsage} maxValue={500} label="Energía" color="#ec4899" icon="⚡" unit="kWh" />
        </div>
      </div>

      {/* --- Mini-preview modelo 3D --- */}
      <div className="mb-8 hover:scale-[1.01] transition-all duration-300">
        <HouseModel3D lightOn={lightOn} securityOn={securityOn} />
      </div>

      <div className="space-y-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-slate-600/20 to-slate-700/20 backdrop-blur-sm">
            <span className="text-2xl">⚙️</span>
          </div>
          <h3 className="text-2xl font-semibold text-slate-200">Dispositivos</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-600/50 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device, i) => (
            <SimpleCard
              key={i}
              className="p-6 hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden border-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm"
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
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl transition-all duration-300 backdrop-blur-sm ${
                      device.on
                        ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 group-hover:from-green-500/30 group-hover:to-emerald-500/30"
                        : "bg-gradient-to-br from-slate-600/20 to-slate-700/20 group-hover:from-slate-600/30 group-hover:to-slate-700/30"
                    }`}
                  >
                    <span className="text-2xl">
                      {device.name.includes("Luz") || device.name.includes("Bombillo")
                        ? "💡"
                        : device.name.includes("Aire")
                          ? "❄️"
                          : "🔌"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-200 group-hover:text-white transition-colors duration-300 truncate">
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
                  <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                    <div className="p-1 rounded bg-slate-700/50">
                      <span className="text-xs">📍</span>
                    </div>
                    <span className="text-sm font-medium">{device.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                    <div className="p-1 rounded bg-slate-700/50">
                      <span className="text-xs">⚡</span>
                    </div>
                    <span className="text-sm font-mono font-medium">{device.power}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                    <span className="font-medium">Consumo actual</span>
                    <span className="font-mono">{device.on ? device.power : "0W"}</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ease-out ${
                        device.on
                          ? "bg-gradient-to-r from-green-500 via-emerald-400 to-green-300 shadow-sm shadow-green-500/30"
                          : "bg-slate-600/50"
                      }`}
                      style={{
                        width: device.on ? `${Math.min((Number.parseInt(device.power) / 1500) * 100, 100)}%` : "0%",
                      }}
                    />
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
