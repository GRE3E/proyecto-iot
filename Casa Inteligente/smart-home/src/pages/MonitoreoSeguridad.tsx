"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Shield, Camera, Power } from "lucide-react"
import SimpleCard from "../components/UI/Card"
import PageHeader from "../components/UI/PageHeader"
import { useThemeByTime } from "../hooks/useThemeByTime"
import { useSecurityCameras } from "../hooks/useSecurityCameras"
import { Wifi, WifiOff } from "lucide-react"

export default function MonitoreoSeguridad() {
  const { colors } = useThemeByTime()
  const { systemOn, setSystemOn, cameraStates, toggleCamera, activeCameras } = useSecurityCameras()

  const cameras = [
    { id: "camera1", name: "Entrada Principal" },
    { id: "camera2", name: "Sala de Estar" }
  ]

  return (
    <div className={`p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter w-full ${colors.background} ${colors.text}`}>
      <PageHeader
        title="Monitoreo y Seguridad"
        icon={<Shield className={`w-8 md:w-10 h-8 md:h-10 ${colors.icon}`} />}
      />

      <div className="mt-6 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Camera className={`w-6 h-6 ${colors.cyanIcon}`} />
              <h4 className={`text-2xl font-bold ${colors.text}`}>Sistema de Cámaras</h4>
            </div>
            
            <SimpleCard
              className={`p-5 sm:p-6 mb-8 border transition-all ${
                systemOn
                  ? `bg-gradient-to-r ${colors.cyanGradient} ${colors.humidityShadow}`
                  : `${colors.cardBg} ${colors.border}`
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Power
                    className={`w-7 h-7 sm:w-8 sm:h-8 ${
                      systemOn ? colors.cyanIcon : colors.mutedText
                    }`}
                  />
                  <div>
                    <p className={`text-xs sm:text-sm ${colors.mutedText}`}>
                      Estado del Sistema
                    </p>
                    <p
                      className={`text-base sm:text-lg font-bold ${
                        systemOn ? colors.greenText : colors.mutedText
                      }`}
                    >
                      {systemOn ? `${activeCameras}/2 Cámaras Activas` : "Sistema Desactivado"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSystemOn(!systemOn)}
                  className={`p-2.5 sm:p-3 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center ${
                    systemOn
                      ? colors.successChip
                      : colors.dangerChip
                  }`}
                  aria-label={systemOn ? "Apagar sistema" : "Encender sistema"}
                >
                  <Power className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </button>
              </div>
            </SimpleCard>

            <div className="grid grid-cols-1 gap-6">
              {cameras.map((camera) => {
                const isActive = cameraStates[camera.id] && systemOn

                return (
                  <SimpleCard
                    key={camera.id}
                    className={`overflow-hidden border transition-all ${
                      isActive
                        ? `bg-gradient-to-br ${colors.cyanGradient} shadow-lg shadow-cyan-500/20`
                        : `${colors.cardBg} ${colors.border}`
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      {/* Header de la cámara */}
                      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-700/30">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isActive ? "bg-green-500/20" : "bg-slate-700/30"}`}>
                            <Camera className={`w-5 h-5 ${isActive ? "text-green-400" : colors.mutedText}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${colors.text}`}>{camera.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {isActive ? (
                                <>
                                  <Wifi className="w-3 h-3 text-green-400" />
                                  <span className="text-xs text-green-400">En línea</span>
                                </>
                              ) : (
                                <>
                                  <WifiOff className="w-3 h-3 text-red-400" />
                                  <span className="text-xs text-red-400">Desactivada</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleCamera(camera.id)}
                          disabled={!systemOn}
                          className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                            isActive
                              ? "bg-green-500/30 text-green-400 hover:bg-green-500/40"
                              : "bg-slate-700/30 text-slate-500 hover:bg-slate-700/50"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          aria-label={`${camera.name}: ${cameraStates[camera.id] ? "desactivar" : "activar"}`}
                        >
                          <Power className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Feed de la cámara */}
                      <div className="relative w-full h-[28rem] bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
                        {/* Imagen de fondo que ocupa todo el espacio */}
                        <img 
                          src={`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 448'%3E%3Crect fill='%23020617' width='400' height='448'/%3E%3C/svg%3E`}
                          alt="feed"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Indicador de estado */}
                        <div
                          className={`absolute top-3 right-3 w-3 h-3 rounded-full ${
                            isActive ? "bg-green-500 animate-pulse" : "bg-red-500"
                          } shadow-lg`}
                        />

                        {isActive ? (
                          <>
                            {/* Efecto de cámara activa */}
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent animate-pulse" />
                            <div className="relative z-10 flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center border border-green-500/30">
                                <Camera className="w-6 h-6 text-green-400" />
                              </div>
                              <div className="flex items-center gap-2 text-green-400 font-medium text-sm">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                Transmitiendo
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Efecto de cámara inactiva */}
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent" />
                            <div className="relative z-10 flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center border border-red-500/30">
                                <Camera className="w-6 h-6 text-red-400" />
                              </div>
                              <span className="text-red-400 font-medium text-sm">Cámara apagada</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Información de ubicación */}
                      <div className="p-3 sm:p-4 bg-slate-900/50 border-t border-slate-700/30 flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-slate-500"}`} />
                        <Camera className="w-4 h-4 text-slate-400" />
                        <span className={`text-xs sm:text-sm font-medium ${colors.mutedText}`}>
                          {camera.name}
                        </span>
                      </div>
                    </div>
                  </SimpleCard>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}