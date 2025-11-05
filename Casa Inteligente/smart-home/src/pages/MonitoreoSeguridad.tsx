"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Shield,
  Activity,
  Camera,
  AlertTriangle,
  CheckCircle,
  Power,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Thermometer,
  Droplets,
  Zap,
} from "lucide-react"

import SimpleCard from "../components/UI/Card"
import SimpleSecurityCamera from "../components/widgets/SecurityCamera"
import LiquidGauge from "../components/widgets/LiquidGauge"
import { useThemeByTime } from "../hooks/useThemeByTime"
import { useMonitoreoSeguridad } from "../hooks/useMonitoreo"
import ProfileNotifications from "../components/UI/ProfileNotifications";
import {
  devicesPage1,
  devicesPage2,
  devicesPage3,
  pageVariants,
  panelVariants,
  panelTransition,
  systemCardVariants,
  systemCardTransition,
  getGlobalIndex,
} from "../utils/monitoreoUtils"

export default function MonitoreoSeguridad() {
  const {
    activeTab,
    setActiveTab,
    temperature,
    setTemperature,
    humidity,
    setHumidity,
    energyUsage,
    setEnergyUsage,
    deviceStates,
    toggleDevice,
    toggleAllDevices,
    cameraOn,
    setCameraOn,
    currentPage,
    handlePageChange,
    allDevicesOn,
    isSystemCardVisible,
    setIsSystemCardVisible,
  } = useMonitoreoSeguridad()

  const { colors } = useThemeByTime()

  return (
    <div className="p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter">
      {/* HEADER: Título + Usuario + Notificaciones (igual que Inicio) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 -mt-1 md:-mt-2 relative">
        {/* Título con ícono */}
        <div className="flex items-center gap-4 -mt-6 md:-mt-7">
          <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/20">
            <Shield className="w-8 md:w-10 h-8 md:h-10 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent tracking-tight translate-y-[0px] md:translate-y-[-4px]">
            Monitoreo y Seguridad
          </h2>
        </div>

        {/* PERFIL + NOTIFICACIONES */}
        <ProfileNotifications />
      </div>
      {/* TABS (debajo del header) */}
      <div className="flex gap-1 border-b border-slate-700/50 mt-4" role="tablist">
        <button
          onClick={() => setActiveTab("seguridad")}
          role="tab"
          aria-selected={activeTab === "seguridad"}
          className={`px-6 py-3 font-medium flex items-center gap-2 relative transition-all ${
            activeTab === "seguridad"
              ? "text-white"
              : "text-slate-400 hover:text-white"
          }`}
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
          className={`px-6 py-3 font-medium flex items-center gap-2 relative transition-all ${
            activeTab === "monitoreo"
              ? "text-white"
              : "text-slate-400 hover:text-white"
          }`}
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

      {/* CONTENIDO PRINCIPAL */}
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
                {/* Indicadores principales */}
                <h3 className="text-2xl font-bold mb-4 text-cyan-300 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" /> Indicadores
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <LiquidGauge
                    value={temperature}
                    maxValue={35}
                    label="Temperatura"
                    color="#22d3ee"
                    icon={<Thermometer />}
                    unit="°C"
                  />
                  <LiquidGauge
                    value={humidity}
                    maxValue={100}
                    label="Humedad"
                    color="#a855f7"
                    icon={<Droplets />}
                    unit="%"
                  />
                  <LiquidGauge
                    value={energyUsage}
                    maxValue={500}
                    label="Energía"
                    color="#ec4899"
                    icon={<Zap />}
                    unit="kWh"
                  />
                </div>

                {/* Controles ambientales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <SimpleCard className="p-6 bg-gradient-to-br from-cyan-900/20 to-blue-900/20">
                    <h4 className="text-lg font-bold mb-3 text-cyan-400 flex items-center gap-2">
                      <Thermometer className="w-4 h-4" /> Control de Temperatura
                    </h4>
                    <input
                      type="range"
                      min="10"
                      max="35"
                      value={temperature}
                      onChange={(e) => setTemperature(parseInt(e.target.value))}
                      className="w-full custom-slider accent-cyan-400"
                    />
                    <p className="text-center mt-2 text-cyan-300 font-semibold">
                      {temperature}°C
                    </p>
                  </SimpleCard>

                  <SimpleCard className="p-6 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                    <h4 className="text-lg font-bold mb-3 text-purple-400 flex items-center gap-2">
                      <Droplets className="w-4 h-4" /> Control de Humedad
                    </h4>
                    <input
                      type="range"
                      min="20"
                      max="80"
                      value={humidity}
                      onChange={(e) => setHumidity(parseInt(e.target.value))}
                      className="w-full custom-slider accent-purple-400"
                    />
                    <p className="text-center mt-2 text-purple-300 font-semibold">
                      {humidity}%
                    </p>
                  </SimpleCard>

                  <SimpleCard className="p-6 bg-gradient-to-br from-pink-900/20 to-rose-900/20">
                    <h4 className="text-lg font-bold mb-3 text-pink-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Control de Energía
                    </h4>
                    <input
                      type="range"
                      min="100"
                      max="500"
                      value={energyUsage}
                      onChange={(e) => setEnergyUsage(parseInt(e.target.value))}
                      className="w-full custom-slider accent-pink-400"
                    />
                    <p className="text-center mt-2 text-pink-300 font-semibold">
                      {energyUsage} kWh
                    </p>
                  </SimpleCard>
                </div>

                {/* Recomendaciones */}
                <SimpleCard className="p-6 bg-gradient-to-br from-blue-900/20 to-indigo-900/20">
                  <h3 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Recomendaciones
                  </h3>
                  <ul className="space-y-3 text-slate-300">
                    <li>• Temperatura ideal: 20–24°C</li>
                    <li>• Humedad óptima: 40–60%</li>
                    <li>• Ventilar cada 2 horas</li>
                    <li>• Mantén consumo en rango eficiente</li>
                  </ul>
                </SimpleCard>
              </>
            ) : (
              <>
                {/* Seguridad */}
                <div className="flex items-center gap-4 mb-6 flex-wrap">
                  <h3 className="text-2xl font-bold text-yellow-300 flex items-center gap-2">
                    <Shield className="w-5 h-5" /> Controles de Seguridad
                  </h3>
                  <div className="flex gap-4">
                    <button
                      onClick={() =>
                        setIsSystemCardVisible(!isSystemCardVisible)
                      }
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-medium flex items-center gap-2 shadow-lg"
                    >
                      {isSystemCardVisible ? (
                        <>
                          <ChevronUp className="w-4 h-4" /> Ocultar
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" /> Mostrar
                        </>
                      )}
                    </button>

                    <button
                      onClick={toggleAllDevices}
                      className={`px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 shadow-lg ${
                        allDevicesOn
                          ? "bg-gradient-to-r from-red-500 to-rose-500"
                          : "bg-gradient-to-r from-green-500 to-teal-500"
                      }`}
                    >
                      <Power className="w-4 h-4" />
                      {allDevicesOn ? "Desactivar Todo" : "Activar Todo"}
                    </button>
                  </div>
                </div>

                {/* Sistema armado */}
                <AnimatePresence>
                  {isSystemCardVisible && (
                    <motion.div
                      variants={systemCardVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={systemCardTransition}
                    >
                      <SimpleCard className="p-4 bg-black/50 rounded-xl shadow-lg backdrop-blur-sm mb-8">
                        <div className="flex justify-between items-center mb-3">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-full bg-yellow-600/20 text-white"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <span className="text-yellow-300 font-bold">
                            Página {currentPage} de 3
                          </span>
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === 3}
                            className="p-2 rounded-full bg-yellow-600/20 text-white"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Grilla de dispositivos */}
                        <motion.div
                          key={currentPage}
                          variants={pageVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ duration: 0.4 }}
                          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
                        >
                          {(currentPage === 1
                            ? devicesPage1
                            : currentPage === 2
                            ? devicesPage2
                            : devicesPage3
                          ).map((device, index) => {
                            const globalIndex = getGlobalIndex(
                              currentPage,
                              index
                            )
                            const isOn = deviceStates[globalIndex]
                            return (
                              <div
                                key={index}
                                className={`p-3 rounded-lg shadow-md text-center transition-all bg-gradient-to-br from-yellow-600/20 to-amber-600/20 ${
                                  isOn ? "ring-2 ring-yellow-400" : ""
                                }`}
                              >
                                <div className="flex justify-center mb-2">
                                  <device.icon className="w-6 h-6 text-yellow-300" />
                                </div>
                                <h3 className="text-xs font-semibold text-green-400">
                                  {device.title}
                                </h3>
                                <p className="text-[10px] text-gray-300">
                                  {device.status(globalIndex, deviceStates)}
                                </p>
                                <button
                                  onClick={() => toggleDevice(globalIndex)}
                                  className={`mt-2 px-2 py-1 rounded-md text-xs font-medium text-white ${
                                    isOn
                                      ? "bg-red-500/80 hover:bg-red-600/80"
                                      : "bg-green-500/80 hover:bg-green-600/80"
                                  }`}
                                >
                                  {isOn ? "Apagar" : "Encender"}
                                </button>
                              </div>
                            )
                          })}
                        </motion.div>
                      </SimpleCard>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cámaras */}
                <h4 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
                  <Camera className="w-5 h-5" /> Cámaras
                </h4>
                <SimpleCard className="p-6 bg-black/50 rounded-xl shadow-lg backdrop-blur-sm">
                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-br ${colors} p-4 rounded-xl`}
                  >
                    <div
                      className={`p-4 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-xl shadow-md`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-blue-400 font-bold">
                          Estado de Cámaras
                        </h3>
                        <button
                          onClick={() => setCameraOn(!cameraOn)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${
                            cameraOn
                              ? "bg-red-500/80 hover:bg-red-600/80"
                              : "bg-green-500/80 hover:bg-green-600/80"
                          }`}
                        >
                          {cameraOn ? "Apagar" : "Encender"}
                        </button>
                      </div>
                      <p className="text-gray-300 text-sm text-center">
                        {cameraOn ? "Cámaras activas" : "Cámaras inactivas"}
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-red-800/20 to-rose-800/20 rounded-xl shadow-md text-center">
                      <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <h3 className="text-yellow-400 font-bold">Alertas</h3>
                      <p className="text-green-400 font-bold text-lg">
                        0 Activas
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {[
                      "Entrada Principal",
                      "Sala de Estar",
                      "Jardín Trasero",
                      "Garaje",
                      "Cocina",
                      "Pasillo",
                    ].map((location, index) => (
                      <SimpleSecurityCamera
                        key={index}
                        cameraOn={cameraOn}
                        location={location}
                      />
                    ))}
                  </div>
                </SimpleCard>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}