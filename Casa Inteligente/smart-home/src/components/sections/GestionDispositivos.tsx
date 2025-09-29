"use client"

import React from "react"
import SimpleCard from "../UI/SimpleCard"
import { 
  Zap, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Activity,
  Filter,
  BarChart3,
  TrendingUp,
  Lightbulb,
  Thermometer,
  Plug
} from "lucide-react"

// Small inline sparkline (SVG) for energy trends
function Sparkline({ data = [180, 200, 240, 220, 210, 230, 250], className = "w-full h-8 md:h-12" }: { data?: number[]; className?: string }) {
  const max = Math.max(...data)
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 100}`).join(" ")
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className}>
      <polyline fill="none" stroke="#7c3aed" strokeWidth={2} points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface Device {
  name: string
  location: string
  power: string
  on: boolean
}

interface Props {
  devices: Device[]
  setDevices: (d: Device[]) => void
  energyUsage: number
  setEnergyUsage: (v: number) => void
  filter: string
  setFilter: (f: string) => void
}

export default function GestionDispositivos({ devices, setDevices, energyUsage, setEnergyUsage, filter, setFilter }: Props) {
  const [activeTab, setActiveTab] = React.useState<"control" | "energia">("control")

  return (
    <div className="font-inter">
      <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
        Gestión de Dispositivos
      </h2>

      {/* Tabs */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3" role="tablist" aria-label="Gestion de Dispositivos Tabs">
        <button
          onClick={() => setActiveTab("control")}
          role="tab"
          aria-selected={activeTab === "control"}
          className={`px-4 md:px-5 py-2 md:py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm md:text-base ${
            activeTab === "control"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
              : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-600/30"
          }`}
        >
          <Activity className="w-4 h-4" />
          Control de dispositivos
        </button>

        <button
          onClick={() => setActiveTab("energia")}
          role="tab"
          aria-selected={activeTab === "energia"}
          className={`px-4 md:px-5 py-2 md:py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm md:text-base ${
            activeTab === "energia"
              ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg"
              : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-600/30"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Consumo de energía (estadísticas)
        </button>
      </div>

      {/* Content area: switch between tabs */}
      <div className="space-y-6">
        <div
          role="tabpanel"
          aria-hidden={activeTab !== "control"}
          className={`${activeTab === "control" ? "block" : "hidden"} transition-transform duration-300`}
        >
          <div className="mb-4 flex flex-wrap gap-3">
            {/* Filters inside Control tab */}
            {[
              { name: "Todos", icon: Filter, color: "purple" },
              { name: "Encendidos", icon: CheckCircle, color: "green" },
              { name: "Apagados", icon: XCircle, color: "red" },
            ].map((f) => (
              <button
                key={f.name}
                onClick={() => setFilter(f.name)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 text-sm md:text-base ${
                  filter === f.name
                    ? f.color === "purple"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                      : f.color === "green"
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25"
                        : "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25"
                    : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-600/30"
                }`}
              >
                <f.icon className="w-4 h-4" />
                {f.name}
              </button>
            ))}
          </div>

          {/* Summary cards moved inside Control tab */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <SimpleCard className="p-3 md:p-4 text-center">
              <div className="w-8 md:w-10 h-8 md:h-10 mx-auto mb-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-sm">
                <CheckCircle className="w-4 md:w-5 h-4 md:h-5" />
              </div>
              <p className="text-xs text-green-400 font-medium mb-1">Activos</p>
              <p className="text-xl md:text-2xl font-bold text-green-400 font-inter">{devices.filter((d) => d.on).length}</p>
            </SimpleCard>

            <SimpleCard className="p-3 md:p-4 text-center">
              <div className="w-8 md:w-10 h-8 md:h-10 mx-auto mb-2 bg-gradient-to-br from-red-400 to-rose-500 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-sm">
                <XCircle className="w-4 md:w-5 h-4 md:h-5" />
              </div>
              <p className="text-xs text-red-400 font-medium mb-1">Inactivos</p>
              <p className="text-xl md:text-2xl font-bold text-red-400 font-inter">{devices.filter((d) => !d.on).length}</p>
            </SimpleCard>

            <SimpleCard className="p-3 md:p-4 text-center">
              <div className="w-8 md:w-10 h-8 md:h-10 mx-auto mb-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-sm">
                <Zap className="w-4 md:w-5 h-4 md:h-5" />
              </div>
              <p className="text-xs text-yellow-400 font-medium mb-1">Consumo</p>
              <p className="text-xl md:text-2xl font-bold text-yellow-400 font-inter">{energyUsage}W</p>
            </SimpleCard>

            <SimpleCard className="p-3 md:p-4 text-center">
              <div className="w-8 md:w-10 h-8 md:h-10 mx-auto mb-2 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-sm">
                <Activity className="w-4 md:w-5 h-4 md:h-5" />
              </div>
              <p className="text-xs text-blue-400 font-medium mb-1">Total</p>
              <p className="text-xl md:text-2xl font-bold text-blue-400 font-inter">{devices.length}</p>
            </SimpleCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {devices
              .filter((d) => filter === "Todos" || (filter === "Encendidos" && d.on) || (filter === "Apagados" && !d.on))
              .map((device, i) => (
                <SimpleCard
                  key={i}
                  className={`p-4 md:p-6 group hover:scale-105 transition-all duration-300 border ${
                    device.on
                      ? "border-green-500/30 hover:bg-gradient-to-br hover:from-green-500/5 hover:to-emerald-600/5"
                      : "border-red-500/30 hover:bg-gradient-to-br hover:from-red-500/5 hover:to-rose-600/5"
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-8 md:w-10 h-8 md:h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-md transition-all duration-300 ${
                            device.on
                              ? "bg-gradient-to-br from-green-400 to-emerald-500 group-hover:shadow-green-500/25"
                              : "bg-gradient-to-br from-slate-500 to-slate-600 group-hover:shadow-slate-500/25"
                          }`}
                        >
                          {device.on ? (
                            <Zap className="w-4 md:w-5 h-4 md:h-5" />
                          ) : device.name.includes("Luz") || device.name.includes("Bombillo") ? (
                            <Lightbulb className="w-4 md:w-5 h-4 md:h-5" />
                          ) : device.name.includes("Aire") ? (
                            <Thermometer className="w-4 md:w-5 h-4 md:h-5" />
                          ) : (
                            <Plug className="w-4 md:w-5 h-4 md:h-5" />
                          )}
                        </div>
                        <div>
                          <span className="text-lg md:text-xl font-semibold block text-white group-hover:text-slate-100 transition-colors font-inter">
                            {device.name}
                          </span>
                          <div
                            className={`mt-1 px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                              device.on
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${device.on ? "bg-green-400" : "bg-red-400"}`} />
                            {device.on ? "ACTIVO" : "INACTIVO"}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 ml-11 md:ml-13">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <span className="w-4 h-4 bg-slate-700 rounded flex items-center justify-center text-xs">
                            <MapPin className="w-3 h-3 text-slate-300" />
                          </span>
                          {device.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <span className="w-4 h-4 bg-slate-700 rounded flex items-center justify-center text-xs">
                            <Zap className="w-3 h-3 text-slate-300" />
                          </span>
                          {device.power}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const updated = [...devices]
                        updated[i].on = !updated[i].on
                        setDevices(updated)
                      }}
                      className={`px-3 md:px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                        device.on
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400 shadow-green-500/25"
                          : "bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-400 hover:to-rose-400 shadow-red-500/25"
                      }`}
                    >
                      {device.on ? "ON" : "OFF"}
                    </button>
                  </div>
                </SimpleCard>
              ))}
          </div>
        </div>

        <div
          role="tabpanel"
          aria-hidden={activeTab !== "energia"}
          className={`${activeTab === "energia" ? "block" : "hidden"} transition-opacity duration-300`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8 mt-6 md:mt-8">
            <SimpleCard className="p-6 md:p-8">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-pink-400 font-inter">Consumo actual: {energyUsage} kWh</h3>
              <div className="space-y-6">
                <input
                  type="range"
                  min="100"
                  max="500"
                  value={energyUsage}
                  onChange={(e) => setEnergyUsage(Number.parseInt(e.target.value))}
                  className="w-full h-3 md:h-4 bg-black/30 rounded-lg appearance-none cursor-pointer"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm md:text-base">
                  <div>
                    <p className="text-green-400 font-bold font-inter">Eficiente</p>
                    <p className="text-xs md:text-sm">100-200 kWh</p>
                  </div>
                  <div>
                    <p className="text-yellow-400 font-bold font-inter">Moderado</p>
                    <p className="text-xs md:text-sm">200-350 kWh</p>
                  </div>
                  <div>
                    <p className="text-red-400 font-bold font-inter">Alto</p>
                    <p className="text-xs md:text-sm">350-500 kWh</p>
                  </div>
                </div>
              </div>
            </SimpleCard>

            <SimpleCard className="p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-green-400 font-inter flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Costo Estimado
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between text-base md:text-lg">
                  <span>Hoy:</span>
                  <span className="text-green-400 font-semibold">$12.50</span>
                </div>
                <div className="flex justify-between text-base md:text-lg">
                  <span>Este mes:</span>
                  <span className="text-yellow-400 font-semibold">$285.30</span>
                </div>
                <div className="flex justify-between text-base md:text-lg">
                  <span>Proyección anual:</span>
                  <span className="text-red-400 font-semibold">$3,420.00</span>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-slate-300 mb-2 font-medium">Tendencia últimos 7 días</p>
                  <div className="w-full h-10 md:h-12 bg-slate-900/30 rounded-lg p-2">
                    <Sparkline />
                  </div>
                </div>
              </div>
            </SimpleCard>
          </div>

          <SimpleCard className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-bold mb-4 text-blue-400 font-inter flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Consumo por Dispositivo
            </h3>
            <div className="space-y-3">
              {devices
                .filter((d) => d.on)
                .map((device, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                    <span className="text-sm md:text-base font-medium">{device.name}</span>
                    <span className="text-blue-400 font-semibold text-sm md:text-base">{device.power}</span>
                  </div>
                ))}
            </div>
          </SimpleCard>
        </div>
      </div>
    </div>
  )
}