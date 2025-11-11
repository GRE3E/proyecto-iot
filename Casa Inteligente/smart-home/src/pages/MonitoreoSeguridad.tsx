"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Shield, Activity, Camera, TrendingUp, Thermometer, Droplets, Video } from "lucide-react"
import SimpleCard from "../components/UI/Card"
import PageHeader from "../components/UI/PageHeader"
import SimpleSecurityCamera from "../components/widgets/SecurityCamera"
import { useMonitoreoSeguridad } from "../hooks/useMonitoreo"
import { panelVariants, panelTransition } from "../utils/monitoreoUtils"

const GaugeWithControl = ({
  value,
  setValue,
  maxValue,
  minValue,
  label,
  icon,
  unit,
  color,
  bgGradient,
}: {
  value: number
  setValue: (v: number) => void
  maxValue: number
  minValue: number
  label: string
  icon: React.ReactNode
  unit: string
  color: string
  bgGradient: string
}) => {
  const percentage = ((value - minValue) / (maxValue - minValue)) * 100
  const strokeWidth = 8
  const radius = 50 - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <SimpleCard className={`p-6 ${bgGradient} backdrop-blur-sm border border-slate-700/50 rounded-2xl`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-white/10 rounded-lg">{icon}</div>
        <h4 className="text-lg font-semibold text-white">{label}</h4>
      </div>
      <div className="relative w-40 h-40 mx-auto mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#1f2937" strokeWidth={strokeWidth} className="opacity-50" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 drop-shadow-lg"
            style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline gap-1">
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-2xl font-bold text-white">{unit}</p>
          </div>
        </div>
      </div>
      <div className="px-2">
        <input
          type="range"
          min={minValue}
          max={maxValue}
          value={value}
          onChange={(e) => setValue(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-white slider-thumb"
          style={{ background: `linear-gradient(to right, ${color} ${percentage}%, #334155 ${percentage}%)` }}
        />
      </div>
    </SimpleCard>
  )
}

export default function MonitoreoSeguridad() {
  const {
    activeTab,
    setActiveTab,
    temperature,
    setTemperature,
    humidity,
    setHumidity,
    cameraOn,
    setCameraOn,
  } = useMonitoreoSeguridad()

  return (
    <div className="p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter w-full">
      {/* Header */}
      <PageHeader
        title="Monitoreo y Seguridad"
        icon={<Shield className="w-8 md:w-10 h-8 md:h-10 text-white" />}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700/50 mt-4" role="tablist">
        <button
          onClick={() => setActiveTab("seguridad")}
          role="tab"
          aria-selected={activeTab === "seguridad"}
          className={`px-6 py-3 font-medium flex items-center gap-2 relative transition-all ${activeTab === "seguridad" ? "text-white" : "text-slate-400 hover:text-white"}`}
        >
          <Shield className="w-5 h-5" />
          Seguridad
          {activeTab === "seguridad" && (
            <motion.span
              layoutId="underline"
              className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("monitoreo")}
          role="tab"
          aria-selected={activeTab === "monitoreo"}
          className={`px-6 py-3 font-medium flex items-center gap-2 relative transition-all ${activeTab === "monitoreo" ? "text-white" : "text-slate-400 hover:text-white"}`}
        >
          <Activity className="w-5 h-5" />
          Monitoreo Ambiental
          {activeTab === "monitoreo" && (
            <motion.span
              layoutId="underline"
              className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="mt-6 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={panelTransition}
          >
            {activeTab === "monitoreo" ? (
              <>
                <h3 className="text-xl md:text-2xl font-bold mb-6 text-white flex items-center gap-2">
                  <TrendingUp className="text-blue-400 w-6 h-6" />
                  Indicadores
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GaugeWithControl
                    value={temperature}
                    setValue={setTemperature}
                    minValue={10}
                    maxValue={35}
                    label="Temperatura"
                    icon={<Thermometer className="w-5 h-5 text-cyan-400" />}
                    unit="°C"
                    color="#22d3ee"
                    bgGradient="bg-gradient-to-br from-cyan-900/20 to-blue-900/20"
                  />
                  <GaugeWithControl
                    value={humidity}
                    setValue={setHumidity}
                    minValue={20}
                    maxValue={80}
                    label="Humedad"
                    icon={<Droplets className="w-5 h-5 text-purple-400" />}
                    unit="%"
                    color="#a855f7"
                    bgGradient="bg-gradient-to-br from-purple-900/20 to-pink-900/20"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <Camera className="w-6 h-6 text-blue-400" />
                  <h4 className="text-2xl font-bold text-white">Sistema de Cámaras</h4>
                </div>
                <SimpleCard
                  className={`p-5 sm:p-6 mb-6 border transition-all ${cameraOn ? "bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-500/30" : "bg-gradient-to-r from-gray-800/40 to-gray-900/40 border-gray-600/30"}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Video
                        className={`w-7 h-7 sm:w-8 sm:h-8 ${cameraOn ? "text-blue-400" : "text-gray-500"}`}
                      />
                      <div>
                        <p
                          className={`text-xs sm:text-sm ${cameraOn ? "text-slate-400" : "text-gray-500"}`}
                        >
                          Estado del Sistema
                        </p>
                        <p
                          className={`text-base sm:text-lg font-bold ${cameraOn ? "text-green-400" : "text-gray-500"}`}
                        >
                          {cameraOn ? "4 Cámaras Activas" : "4 Cámaras Inactivas"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCameraOn(!cameraOn)}
                      className={`p-2.5 sm:p-3 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center ${cameraOn ? "bg-green-500/90 hover:bg-green-600/90 text-white" : "bg-red-500/90 hover:bg-red-600/90 text-white"}`}
                      aria-label={cameraOn ? "Apagar cámaras" : "Encender cámaras"}
                    >
                      <Camera className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </SimpleCard>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {["Entrada Principal", "Sala de Estar", "Jardín Trasero", "Garaje"].map((location, index) => (
                    <SimpleSecurityCamera key={index} cameraOn={cameraOn} location={location} />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}