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
import { useThemeByTime } from "../hooks/useThemeByTime"
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
  const { colors } = useThemeByTime()

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
    <div className={`p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter w-full ${colors.background} ${colors.text}`}>
      <PageHeader
        title="Gestión de dispositivos"
        icon={<Computer className={`w-8 md:w-10 h-8 md:h-10 ${colors.icon}`} />}
      />

      <div
        className={`flex flex-col sm:flex-row gap-0 sm:gap-1 w-full border-b ${colors.border}`}
        role="tablist"
      >
        <button
          onClick={() => setActiveTab("control")}
          role="tab"
          aria-selected={activeTab === "control"}
          className={`min-h-[52px] sm:min-h-[48px] px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 font-medium transition-colors duration-300 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base md:text-lg relative ${
            activeTab === "control" ? colors.text : `${colors.mutedText} ${colors.buttonHover}`
          }`}
        >
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="text-center sm:text-left leading-tight font-semibold">
            Control de dispositivos
          </span>
          {activeTab === "control" && (
            <motion.span
              layoutId="underline"
              className={`absolute bottom-[-1px] left-0 right-0 h-[3px] bg-gradient-to-r ${colors.secondary} rounded-full`}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("energia")}
          role="tab"
          aria-selected={activeTab === "energia"}
          className={`min-h-[52px] sm:min-h-[48px] px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 font-medium transition-colors duration-300 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base md:text-lg relative ${
            activeTab === "energia" ? colors.text : `${colors.mutedText} ${colors.buttonHover}`
          }`}
        >
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="text-center sm:text-left leading-tight font-semibold">
            Consumo de energía
          </span>
          {activeTab === "energia" && (
            <motion.span
              layoutId="underline"
              className={`absolute bottom-[-1px] left-0 right-0 h-[3px] bg-gradient-to-r ${colors.accent} rounded-full`}
            />
          )}
        </button>
      </div>

      <div className="space-y-5 sm:space-y-6 md:space-y-7 mt-4 sm:mt-5 md:mt-6">
        <AnimatePresence mode="wait">
          {activeTab === "control" && (
            <motion.div
              key="control-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              role="tabpanel"
            >
              <div className="mb-5 sm:mb-6 flex flex-col xl:flex-row md:grid md:grid-cols-[1fr_1fr] gap-2 sm:gap-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { name: "Todos", icon: Filter, type: null, color: "purple" },
                    { name: "Luz", icon: Lightbulb, type: "luz", color: "yellow" },
                    { name: "Puerta", icon: DoorOpen, type: "puerta", color: "orange" },
                    { name: "Ventilador", icon: Wind, type: "actuador", color: "cyan" },
                  ].map((btn) => (
                    <motion.button
                      key={btn.type}
                      onClick={() => setDeviceTypeFilter(btn.type)}
                      className={`min-h-[48px] px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm border ${
                        deviceTypeFilter === btn.type
                          ? colors.buttonActive
                          : `${colors.buttonInactive} ${colors.buttonHover}`
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {React.createElement(btn.icon, { className: "w-4 h-4 flex-shrink-0" })}
                      <span>{btn.name}</span>
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-2">
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
                      className={`flex-1 min-h-[48px] px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm border ${
                        filter === f.name
                          ? f.color === "green" 
                            ? colors.successChip 
                            : colors.dangerChip
                          : `${colors.buttonInactive} ${colors.buttonHover}`
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {React.createElement(f.icon, { className: "w-4 h-4 flex-shrink-0" })}
                      <span>{f.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-6 sm:mb-7 md:mb-8">
                {[
                  { title: "Total", icon: Activity, value: filteredDevices.length, gradient: colors.purpleGradient, text: colors.purpleText, iconColor: colors.purpleIcon },
                  { title: "Activos", icon: CheckCircle, value: filteredDevices.filter((d) => d.on).length, gradient: colors.greenGradient, text: colors.greenText, iconColor: colors.greenIcon },
                  { title: "Inactivos", icon: XCircle, value: filteredDevices.filter((d) => !d.on).length, gradient: colors.orangeGradient, text: colors.orangeText, iconColor: colors.redIcon },
                  { title: "Consumo", icon: Zap, value: `${energyUsage}W`, gradient: colors.cyanGradient, text: colors.cyanText, iconColor: colors.yellowIcon },
                ].map((stat) => (
                  <SimpleCard key={stat.title} className={`p-4 sm:p-5 md:p-6 text-center bg-gradient-to-br ${stat.gradient} border ${colors.cardHover}`}>
                    <div className="flex justify-center items-center mb-2 sm:mb-3">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center ${colors.chipBg} shadow-lg`}>
                        {React.createElement(stat.icon, { className: `w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${stat.iconColor}` })}
                      </div>
                    </div>
                    <p className={`text-xs sm:text-sm md:text-base font-semibold mb-1 uppercase tracking-wider ${stat.text}`}>
                      {stat.title}
                    </p>
                    <p className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold ${colors.text} font-inter`}>
                      {stat.value}
                    </p>
                  </SimpleCard>
                ))}
              </div>

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
                        className={`h-full p-4 sm:p-5 md:p-6 flex items-center gap-3 sm:gap-4 md:gap-5 transition-all duration-300 border ${colors.cardBg} ${colors.cardHover} ${
                          device.on ? colors.energyBorder : colors.tempBorder
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <div className={`w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full flex items-center justify-center transition-all duration-300 ${
                            device.on ? colors.deviceOn : colors.deviceOff
                          }`}>
                            {getDeviceIcon(device)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm sm:text-base md:text-lg lg:text-xl font-bold ${colors.text} font-inter whitespace-normal`}>
                              {device.name}
                            </span>
                            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 rounded-full ${
                              device.on ? colors.deviceActive : colors.deviceInactive
                            }`} />
                          </div>
                          <div className={`text-xs sm:text-sm ${colors.mutedText}`}>{device.power}</div>
                        </div>

                        <div className="flex-shrink-0">
                          <button
                            onClick={() => toggleDevice(device.id)}
                            className={`w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 border-2 ${
                              device.on 
                                ? `bg-red-500 hover:bg-red-600 border-red-400/50 text-white` 
                                : `bg-green-500 hover:bg-green-600 border-green-400/50 text-white`
                            }`}
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
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-7 md:mb-8">
                <SimpleCard className={`p-5 sm:p-6 md:p-7 lg:p-8 flex flex-col items-center justify-center ${colors.cardBg}`}>
                  <div className="flex items-center justify-between w-full mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Zap className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0 ${colors.violetIcon}`} />
                      <h3 className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold ${colors.text} font-inter`}>
                        Consumo actual
                      </h3>
                    </div>
                    <div className={`flex items-center text-xs sm:text-sm font-semibold ${colors.successChip} rounded-full px-2 py-1`}>
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
                    className={`w-full h-2 md:h-3 ${colors.sliderBg} rounded-lg appearance-none cursor-pointer mt-4 ${colors.sliderAccent}`}
                    style={{
                      background: `linear-gradient(to right, #4ade80 ${((energyUsage - 100) / 400) * 100}%, ${colors.sliderBg} ${((energyUsage - 100) / 400) * 100}%)`
                    }}
                  />
                </SimpleCard>

                <SimpleCard className={`p-5 sm:p-6 md:p-7 lg:p-8 ${colors.cardBg}`}>
                  <h3 className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-4 sm:mb-5 md:mb-6 ${colors.greenText} font-inter flex items-center gap-2`}>
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0" />
                    Costo estimado
                  </h3>
                  <div className="space-y-3 sm:space-y-4 md:space-y-5">
                    <div className={`flex justify-between items-center text-sm sm:text-base md:text-lg lg:text-xl p-2 sm:p-3 rounded-lg ${colors.tableBg}`}>
                      <span className={`${colors.mutedText} font-medium`}>Hoy:</span>
                      <span className={`${colors.greenText} font-bold`}>${estimatedDailyCost.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between items-center text-sm sm:text-base md:text-lg lg:text-xl p-2 sm:p-3 rounded-lg ${colors.tableBg}`}>
                      <span className={`${colors.mutedText} font-medium`}>Este mes:</span>
                      <span className={`${colors.orangeText} font-bold`}>${estimatedMonthlyCost.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between items-center text-sm sm:text-base md:text-lg lg:text-xl p-2 sm:p-3 rounded-lg ${colors.tableBg}`}>
                      <span className={`${colors.mutedText} font-medium`}>Proyección anual:</span>
                      <span className={`${colors.redIcon} font-bold`}>${estimatedAnnualCost.toFixed(2)}</span>
                    </div>
                  </div>
                </SimpleCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                <SimpleCard className={`p-5 sm:p-6 md:p-7 lg:p-8 ${colors.cardBg}`}>
                  <h3 className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-4 sm:mb-5 md:mb-6 ${colors.purpleText} font-inter flex items-center gap-2`}>
                    <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0" />
                    Tendencia de Consumo
                  </h3>
                  <div className={`w-full h-24 sm:h-32 md:h-40 ${colors.panelBg} rounded-lg p-2 sm:p-3`}>
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
                <SimpleCard className={`p-5 sm:p-6 md:p-7 lg:p-8 ${colors.cardBg}`}>
                  <h3 className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-4 sm:mb-5 md:mb-6 ${colors.cyanText} font-inter flex items-center gap-2`}>
                    <Activity className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex-shrink-0" />
                    Consumo por Dispositivo
                  </h3>
                  <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
                    {devices
                      .filter((d) => d.on)
                      .map((device, i) => (
                        <div
                          key={i}
                          className={`flex justify-between items-center p-3.5 sm:p-4 md:p-5 ${colors.panelBg} rounded-xl ${colors.buttonHover} transition-colors`}
                        >
                          <span className={`text-sm sm:text-base md:text-lg font-medium ${colors.text} truncate pr-3`}>
                            {device.name}
                          </span>
                          <span className={`${colors.cyanText} font-bold text-sm sm:text-base md:text-lg flex-shrink-0`}>
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