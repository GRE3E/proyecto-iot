"use client"

import React from "react"
import SimpleCard from "../components/UI/Card"
import PageHeader from "../components/UI/PageHeader"
import { motion, AnimatePresence } from "framer-motion"
import {
  Zap,
  CheckCircle,
  XCircle,
  Activity,
  Filter,
  BarChart3,
  TrendingUp,
  Lightbulb,
  Wind,
  DoorOpen,
  Power,
  BarChart2,
  Calendar,
  Computer,
} from "lucide-react"
import { useGestionDispositivos } from "../hooks/useGestionDispositivos"
import EnergyGauge from "../components/widgets/EnergyGauge"

interface Device {
  id: number
  name: string
  power: string
  on: boolean
  device_type: string
  state_json: { status: string }
  last_updated: string
}

export default function GestionDispositivos() {
  const {
    devices,
    energyUsage,
    setEnergyUsage,
    filter,
    setFilter,
    toggleDevice,
    estimatedDailyCost,
    estimatedMonthlyCost,
    estimatedAnnualCost,
  } = useGestionDispositivos()

  const [activeTab, setActiveTab] = React.useState<"control" | "energia">("control")
  const [deviceTypeFilter, setDeviceTypeFilter] = React.useState<string | null>(null)

  const getDeviceIcon = (device: Device) => {
    switch (device.device_type) {
      case "luz":
        return <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6" />
      case "puerta":
        return <DoorOpen className="w-5 h-5 sm:w-6 sm:h-6" />
      case "ventilador":
        return <Wind className="w-5 h-5 sm:w-6 sm:h-6" />
      default:
        return <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
    }
  }

  const filteredDevices = devices.filter((d) => {
    const statusMatch =
      filter === "Todos" || (filter === "Encendidos" && d.on) || (filter === "Apagados" && !d.on)
    const typeMatch = deviceTypeFilter === null || d.device_type === deviceTypeFilter
    return statusMatch && typeMatch
  })

  return (
    <div className="p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter w-full">
      {/* Header */}
      <PageHeader
        title="Gestión de dispositivos"
        icon={<Computer className="w-8 md:w-10 h-8 md:h-10 text-white" />}
      />

      {/* Pestañas */}
      <div
        className="flex flex-col sm:flex-row gap-0 sm:gap-1 w-full border-b border-slate-700/50"
        role="tablist"
        aria-label="Gestion de Dispositivos Tabs"
      >
        <button
          onClick={() => setActiveTab("control")}
          role="tab"
          aria-selected={activeTab === "control"}
          className={`min-h-[52px] sm:min-h-[48px] px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 font-medium transition-colors duration-300 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base md:text-lg relative group ${
            activeTab === "control" ? "text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="text-center sm:text-left leading-tight font-semibold">
            Control de dispositivos
          </span>
          {activeTab === "control" && (
            <motion.span
              layoutId="underline"
              className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("energia")}
          role="tab"
          aria-selected={activeTab === "energia"}
          className={`min-h-[52px] sm:min-h-[48px] px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 font-medium transition-colors duration-300 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base md:text-lg relative group ${
            activeTab === "energia" ? "text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="text-center sm:text-left leading-tight font-semibold">
            Consumo de energía
          </span>
          {activeTab === "energia" && (
            <motion.span
              layoutId="underline"
              className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full"
            />
          )}
        </button>
      </div>

      {/* Contenido de pestañas */}
      <div className="space-y-5 sm:space-y-6 md:space-y-7 xl:space-y-0 mt-4 sm:mt-5 md:mt-6 px-3 sm:px-4 md:px-6">
        <AnimatePresence mode="wait">
          {activeTab === "control" && (
            <motion.div
              key="control-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              role="tabpanel"
              aria-hidden={activeTab !== "control"}
            >
              {/* Filtros */}
              <div className="mb-5 sm:mb-6 xl:mb-0 flex flex-col xl:flex-row md:grid md:grid-cols-[1fr_1fr_1.25fr] md:grid-rows-2 lg:grid lg:grid-cols-[1fr_1fr_1.35fr] lg:grid-rows-2 items-stretch sm:items-center md:items-stretch xl:items-start justify-start xl:justify-between gap-2 sm:gap-3 pb-2 xl:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0 md:mx-0 md:px-6 lg:mx-0 lg:px-6">
                {/* Filtros de tipo */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 justify-items-start justify-start gap-1 sm:gap-2 md:gap-1 lg:gap-1 pb-0 w-full md:w-full lg:w-full xl:w-auto md:flex-1 md:min-w-0 lg:flex-1 lg:min-w-0 xl:max-w-fit md:col-span-2 md:row-span-2 xl:self-start">
                  {[
                    { name: "Todos", icon: Filter, type: null, color: "purple" },
                    { name: "Luz", icon: Lightbulb, type: "luz", color: "yellow" },
                    { name: "Puerta", icon: DoorOpen, type: "puerta", color: "orange" },
                    { name: "Ventilador", icon: Wind, type: "actuador", color: "cyan" },
                  ].map((btn, idx) => (
                    <motion.button
                      key={btn.type}
                      onClick={() => setDeviceTypeFilter(btn.type)}
                      className={`w-full sm:w-full md:w-40 lg:w-40 xl:w-40 min-h-[52px] sm:min-h-[48px] px-5 sm:px-6 md:px-6 py-3 sm:py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base border ${
                        deviceTypeFilter === btn.type
                          ? `bg-gradient-to-r ${
                              btn.color === "yellow"
                                ? "from-yellow-600 to-amber-600"
                                : btn.color === "cyan"
                                  ? "from-cyan-600 to-blue-600"
                                  : btn.color === "orange"
                                    ? "from-orange-600 to-red-600"
                                    : "from-purple-600 to-pink-600"
                            } text-white shadow-lg shadow-purple-500/30 border-transparent`
                          : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border-slate-600/40"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                    >
                      {React.createElement(btn.icon, { className: "w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" })}
                      <span className="whitespace-nowrap">{btn.name}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Filtros de estado */}
                <div className="flex w-full sm:w-auto md:w-full lg:w-full xl:w-auto items-center gap-2 sm:gap-3 justify-between md:justify-start lg:justify-end xl:justify-end mt-0 md:flex-col md:gap-1 lg:gap-1 md:col-span-1 md:row-span-2 xl:flex-row xl:gap-3 xl:col-auto xl:row-auto xl:self-start">
                  {[
                    { name: "Encendidos", icon: CheckCircle, color: "green" },
                    { name: "Apagados", icon: XCircle, color: "red" },
                  ].map((f) => (
                    <motion.button
                      key={f.name}
                      onClick={() => {
                        if (filter === f.name) {
                          setFilter("Todos")
                        } else {
                          setFilter(f.name)
                        }
                      }}
                      className={`flex-1 sm:flex-none w-full sm:w-auto xl:w-40 min-h-[52px] sm:min-h-[48px] px-5 sm:px-6 md:px-7 py-3 sm:py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-sm sm:text-base whitespace-nowrap ${
                        filter === f.name
                          ? `bg-gradient-to-r ${f.color === "green" ? "from-green-600 to-emerald-600" : "from-red-600 to-rose-600"} text-white shadow-lg shadow-${f.color}-500/30`
                          : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-600/40"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {React.createElement(f.icon, { className: "w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" })}
                      <span>{f.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Tarjetas de resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-6 sm:mb-7 md:mb-8">
                {/* TOTAL */}
                <SimpleCard className="p-4 sm:p-5 md:p-6 text-center bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                  <div className="flex justify-center items-center mb-2 sm:mb-3">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center bg-blue-500/20 shadow-lg shadow-blue-500/20">
                      <Activity className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-400" />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm md:text-base text-blue-400 font-semibold mb-1 uppercase tracking-wider">
                    Total
                  </p>
                  <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white font-inter">
                    {filteredDevices.length}
                  </p>
                </SimpleCard>

                {/* ACTIVOS */}
                <SimpleCard className="p-4 sm:p-5 md:p-6 text-center bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                  <div className="flex justify-center items-center mb-2 sm:mb-3">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center bg-green-500/20 shadow-lg shadow-green-500/20">
                      <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-400" />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm md:text-base text-green-400 font-semibold mb-1 uppercase tracking-wider">
                    Activos
                  </p>
                  <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white font-inter">
                    {filteredDevices.filter((d) => d.on).length}
                  </p>
                </SimpleCard>

                {/* INACTIVOS */}
                <SimpleCard className="p-4 sm:p-5 md:p-6 text-center bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                  <div className="flex justify-center items-center mb-2 sm:mb-3">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center bg-red-500/20 shadow-lg shadow-red-500/20">
                      <XCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-400" />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm md:text-base text-red-400 font-semibold mb-1 uppercase tracking-wider">
                    Inactivos
                  </p>
                  <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white font-inter">
                    {filteredDevices.filter((d) => !d.on).length}
                  </p>
                </SimpleCard>

                {/* CONSUMO */}
                <SimpleCard className="p-4 sm:p-5 md:p-6 text-center bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                  <div className="flex justify-center items-center mb-2 sm:mb-3">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center bg-yellow-500/20 shadow-lg shadow-yellow-500/20">
                      <Zap className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-400" />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm md:text-base text-yellow-400 font-semibold mb-1 uppercase tracking-wider">
                    Consumo
                  </p>
                  <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white font-inter">
                    {energyUsage}W
                  </p>
                </SimpleCard>
              </div>

              {/* Lista de dispositivos */}
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                <AnimatePresence>
                  {filteredDevices.map((device, i) => (
                    <motion.div
                      key={device.id}
                      initial={{ opacity: 0, y: 50, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                    >
                      <SimpleCard
                        className={`p-4 sm:p-5 md:p-6 flex items-center gap-3 sm:gap-4 md:gap-5 transition-all duration-300 relative border 
                          ${device.on ? "border-green-500/40" : "border-red-500/40"}
                          hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10
                          bg-gradient-to-br from-purple-500/10 to-blue-500/10
                        `}
                      >
                        <div className="flex-shrink-0">
                          <div
                            className={`w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full flex items-center justify-center transition-all duration-300 
                              ${device.on ? "bg-green-500/20 shadow-lg shadow-green-500/20" : "bg-red-500/20 shadow-lg shadow-red-500/20"}
                            `}
                          >
                            {getDeviceIcon(device)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-white font-inter whitespace-normal">
                              {device.name}
                            </span>
                            <div
                              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 rounded-full ${device.on ? "bg-green-400 animate-pulse shadow-lg shadow-green-400/50" : "bg-red-400"}`}
                            />
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400">{device.power}</div>
                        </div>

                        <div className="flex-shrink-0">
                          <button
                            onClick={() => toggleDevice(device.id)}
                            className={`w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95
                              ${device.on ? "bg-red-500/40 hover:bg-red-500 border-2 border-red-400/50" : "bg-green-500/40 hover:bg-green-500 border-2 border-green-400/50"}
                            `}
                            aria-label={device.on ? "Apagar" : "Encender"}
                          >
                            <Power className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9" />
                          </button>
                        </div>
                      </SimpleCard>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === "energia" && (
            <motion.div
              key="energia-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              role="tabpanel"
              aria-hidden={activeTab !== "energia"}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-7 md:mb-8">
                <SimpleCard className="p-5 sm:p-6 md:p-7 lg:p-8 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-between w-full mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Zap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0 text-pink-400" />
                      <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white font-inter">
                        Consumo actual
                      </h3>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm font-semibold text-green-400 bg-green-500/20 rounded-full px-2 py-1">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Eficiente
                    </div>
                  </div>
                  <EnergyGauge
                    value={energyUsage}
                    maxValue={500}
                    label="Consumo total"
                    color="pink"
                    icon={<Zap />}
                  />
                  <input
                    type="range"
                    min="100"
                    max="500"
                    value={energyUsage}
                    onChange={(e) => setEnergyUsage(Number.parseInt(e.target.value))}
                    className="w-full h-2 md:h-3 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-lg appearance-none cursor-pointer mt-4"
                  />
                </SimpleCard>

                <SimpleCard className="p-5 sm:p-6 md:p-7 lg:p-8">
                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-4 sm:mb-5 md:mb-6 text-green-400 font-inter flex items-center gap-2">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0" />
                    <span>Costo estimado</span>
                  </h3>
                  <div className="space-y-3 sm:space-y-4 md:space-y-5">
                    <div className="flex justify-between items-center text-sm sm:text-base md:text-lg lg:text-xl p-2 sm:p-3 rounded-lg bg-slate-800/30">
                      <span className="text-slate-300 font-medium">Hoy:</span>
                      <span className="text-green-400 font-bold">${estimatedDailyCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm sm:text-base md:text-lg lg:text-xl p-2 sm:p-3 rounded-lg bg-slate-800/30">
                      <span className="text-slate-300 font-medium">Este mes:</span>
                      <span className="text-yellow-400 font-bold">${estimatedMonthlyCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm sm:text-base md:text-lg lg:text-xl p-2 sm:p-3 rounded-lg bg-slate-800/30">
                      <span className="text-slate-300 font-medium">Proyección anual:</span>
                      <span className="text-red-400 font-bold">${estimatedAnnualCost.toFixed(2)}</span>
                    </div>
                  </div>
                </SimpleCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-7 md:mb-8">
                <SimpleCard className="p-5 sm:p-6 md:p-7 lg:p-8">
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-4 sm:mb-5 md:mb-6 text-purple-400 font-inter flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0" />
                    <span>Tendencia de Consumo (Últimos 14 días)</span>
                  </h3>
                  <div className="w-full h-24 sm:h-32 md:h-40 bg-slate-900/40 rounded-lg p-2 sm:p-3">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const data = [210, 220, 200, 230, 240, 250, 260, 245, 235, 255, 270, 265, 280, 290]
                        const max = Math.max(...data)
                        const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 100}`).join(" ")
                        return (
                          <>
                            <path d={`M 0,${100 - (data[0] / max) * 100} L ${points}`} fill="url(#chartGradient)" stroke="none" />
                            <polyline fill="none" stroke="#a78bfa" strokeWidth={2} points={points} strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        )
                      })()}
                    </svg>
                  </div>
                </SimpleCard>
                <SimpleCard className="p-5 sm:p-6 md:p-7 lg:p-8">
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-4 sm:mb-5 md:mb-6 text-blue-400 font-inter flex items-center gap-2">
                    <Activity className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0" />
                    <span>Consumo por Dispositivo</span>
                  </h3>
                  <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
                    {devices
                      .filter((d) => d.on)
                      .map((device, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center p-3.5 sm:p-4 md:p-5 bg-slate-800/40 rounded-xl hover:bg-slate-800/60 transition-colors"
                        >
                          <span className="text-sm sm:text-base md:text-lg font-medium text-white truncate pr-3">
                            {device.name}
                          </span>
                          <span className="text-blue-400 font-bold text-sm sm:text-base md:text-lg flex-shrink-0">
                            {device.power}
                          </span>
                        </div>
                      ))}
                  </div>
                </SimpleCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}