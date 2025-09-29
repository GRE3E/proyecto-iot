"use client"

import { useState } from "react"
import SimpleCard from "../UI/SimpleCard"
import SimpleButton from "../UI/SimpleButton"
import LiquidGauge from "../widgets/LiquidGauge"
import SimpleSecurityCamera from "../widgets/SecurityCamera"
import { 
  Shield, 
  Thermometer, 
  Camera, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  Wind,
  Droplets,
  Zap
} from "lucide-react"

interface Props {
  temperature: number
  setTemperature: (v: number) => void
  humidity: number
  setHumidity: (v: number) => void
  energyUsage: number
  setEnergyUsage: (v: number) => void
}

export default function MonitoreoSeguridad({
  temperature,
  setTemperature,
  humidity,
  setHumidity,
  energyUsage,
  setEnergyUsage,
}: Props) {
  const [activeTab, setActiveTab] = useState<"monitoreo" | "seguridad">("seguridad")
  const [securityOn, setSecurityOn] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)

  return (
    <div className="font-inter">
      <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
        Monitoreo y Seguridad
      </h2>

      <div className="mb-6 flex flex-col sm:flex-row gap-3" role="tablist" aria-label="Monitoreo y Seguridad Tabs">
        <button
          onClick={() => setActiveTab("seguridad")}
          role="tab"
          aria-selected={activeTab === "seguridad"}
          className={`px-4 md:px-5 py-2 md:py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm md:text-base ${
            activeTab === "seguridad" ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg" : "bg-slate-800/50 text-slate-300"
          }`}
        >
          <Shield className="w-4 h-4" />
          Seguridad
        </button>

        <button
          onClick={() => setActiveTab("monitoreo")}
          role="tab"
          aria-selected={activeTab === "monitoreo"}
          className={`px-4 md:px-5 py-2 md:py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm md:text-base ${
            activeTab === "monitoreo" ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg" : "bg-slate-800/50 text-slate-300"
          }`}
        >
          <Activity className="w-4 h-4" />
          Monitoreo Ambiental
        </button>
      </div>

      <div className="space-y-6">
        <div role="tabpanel" aria-hidden={activeTab !== "monitoreo"} className={`${activeTab === "monitoreo" ? "block" : "hidden"}`}>
          <h3 className="text-xl md:text-2xl font-bold mb-4 text-cyan-300 font-inter flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Indicadores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-6">
            <LiquidGauge 
              value={temperature} 
              maxValue={35} 
              label="Temperatura" 
              color="#06b6d4" 
              icon={<Thermometer className="w-5 h-5" />} 
              unit="°C" 
            />
            <LiquidGauge 
              value={humidity} 
              maxValue={100} 
              label="Humedad" 
              color="#a855f7" 
              icon={<Droplets className="w-5 h-5" />} 
              unit="%" 
            />
            <LiquidGauge 
              value={energyUsage} 
              maxValue={500} 
              label="Energía" 
              color="#ec4899" 
              icon={<Zap className="w-5 h-5" />} 
              unit=" kWh" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <SimpleCard className="p-4 md:p-6">
              <h4 className="text-base md:text-lg font-bold mb-4 text-cyan-400 font-inter flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Control de Temperatura
              </h4>
              <input
                type="range"
                min="10"
                max="35"
                value={temperature}
                onChange={(e) => setTemperature(Number.parseInt(e.target.value))}
                className="w-full h-2 md:h-3 bg-black/30 rounded-lg appearance-none cursor-pointer"
              />
            </SimpleCard>

            <SimpleCard className="p-4 md:p-6">
              <h4 className="text-base md:text-lg font-bold mb-4 text-purple-400 font-inter flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                Control de Humedad
              </h4>
              <input
                type="range"
                min="20"
                max="80"
                value={humidity}
                onChange={(e) => setHumidity(Number.parseInt(e.target.value))}
                className="w-full h-2 md:h-3 bg-black/30 rounded-lg appearance-none cursor-pointer"
              />
            </SimpleCard>

            <SimpleCard className="p-4 md:p-6">
              <h4 className="text-base md:text-lg font-bold mb-4 text-pink-400 font-inter flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Control de Energía
              </h4>
              <input
                type="range"
                min="100"
                max="500"
                value={energyUsage}
                onChange={(e) => setEnergyUsage(Number.parseInt(e.target.value))}
                className="w-full h-2 md:h-3 bg-black/30 rounded-lg appearance-none cursor-pointer"
              />
            </SimpleCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <SimpleCard className="p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold mb-4 text-green-400 font-inter flex items-center gap-2">
                <Wind className="w-5 h-5" />
                Calidad del Aire
              </h3>
              <div className="space-y-3 text-sm md:text-base">
                <div className="flex justify-between items-center">
                  <span>CO2:</span>
                  <span className="text-green-400 font-semibold">420 ppm - Excelente</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>PM2.5:</span>
                  <span className="text-green-400 font-semibold">12 μg/m³ - Bueno</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>VOCs:</span>
                  <span className="text-yellow-400 font-semibold">0.3 mg/m³ - Moderado</span>
                </div>
              </div>
            </SimpleCard>

            <SimpleCard className="p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-bold mb-4 text-blue-400 font-inter flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recomendaciones
              </h3>
              <div className="space-y-2 text-sm md:text-base">
                <p className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  Temperatura ideal: 20-24°C
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  Humedad óptima: 40-60%
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  Ventilar cada 2 horas
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  Mantén consumo en rango eficiente
                </p>
              </div>
            </SimpleCard>
          </div>
        </div>

        <div role="tabpanel" aria-hidden={activeTab !== "seguridad"} className={`${activeTab === "seguridad" ? "block" : "hidden"}`}>
          <h3 className="text-xl md:text-2xl font-bold mb-4 text-yellow-300 font-inter flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Controles de Seguridad
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <SimpleCard className="p-4 md:p-6">
              <div className="text-center">
                <div className="w-12 md:w-16 h-12 md:h-16 mx-auto mb-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                  <Shield className="w-6 md:w-8 h-6 md:h-8 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3 text-green-400 font-inter">Sistema Armado</h3>
                <SimpleButton 
                  onClick={() => setSecurityOn(!securityOn)} 
                  active={securityOn} 
                  className={`${securityOn ? "bg-green-500" : "bg-red-500"} text-sm md:text-base px-4 py-2`}
                >
                  {securityOn ? "ACTIVADO" : "DESACTIVADO"}
                </SimpleButton>
              </div>
            </SimpleCard>

            <SimpleCard className="p-4 md:p-6">
              <div className="text-center">
                <div className="w-12 md:w-16 h-12 md:h-16 mx-auto mb-3 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
                  <Camera className="w-6 md:w-8 h-6 md:h-8 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3 text-blue-400 font-inter">Cámaras</h3>
                <SimpleButton 
                  onClick={() => setCameraOn(!cameraOn)} 
                  active={cameraOn} 
                  className={`${cameraOn ? "bg-green-500" : "bg-red-500"} text-sm md:text-base px-4 py-2`}
                >
                  {cameraOn ? "ACTIVAS" : "INACTIVAS"}
                </SimpleButton>
              </div>
            </SimpleCard>

            <SimpleCard className="p-4 md:p-6">
              <div className="text-center">
                <div className="w-12 md:w-16 h-12 md:h-16 mx-auto mb-3 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 md:w-8 h-6 md:h-8 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3 text-yellow-400 font-inter">Alertas</h3>
                <p className="text-xl md:text-2xl font-bold text-green-400 font-inter">0 Activas</p>
              </div>
            </SimpleCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-4">
            <SimpleSecurityCamera cameraOn={cameraOn} location="Entrada Principal" />
            <SimpleSecurityCamera cameraOn={cameraOn} location="Sala de Estar" />
            <SimpleSecurityCamera cameraOn={cameraOn} location="Jardín Trasero" />
            <SimpleSecurityCamera cameraOn={cameraOn} location="Garaje" />
            <SimpleSecurityCamera cameraOn={cameraOn} location="Cocina" />
            <SimpleSecurityCamera cameraOn={cameraOn} location="Pasillo" />
          </div>
        </div>
      </div>
    </div>
  )
}