"use client"

import { useState } from "react"
import SimpleCard from "../UI/SimpleCard"
import SimpleButton from "../UI/SimpleButton"
import LiquidGauge from "../widgets/LiquidGauge"
import SimpleSecurityCamera from "../widgets/SecurityCamera"

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
    <div>
      <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
        Monitoreo y Seguridad
      </h2>

      <div className="mb-6 flex gap-3" role="tablist" aria-label="Monitoreo y Seguridad Tabs">
        <button
          onClick={() => setActiveTab("seguridad")}
          role="tab"
          aria-selected={activeTab === "seguridad"}
          className={`px-5 py-2 rounded-xl font-medium transition-all duration-300 ${
            activeTab === "seguridad" ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg" : "bg-slate-800/50 text-slate-300"
          }`}
        >
          Seguridad
        </button>

        <button
          onClick={() => setActiveTab("monitoreo")}
          role="tab"
          aria-selected={activeTab === "monitoreo"}
          className={`px-5 py-2 rounded-xl font-medium transition-all duration-300 ${
            activeTab === "monitoreo" ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg" : "bg-slate-800/50 text-slate-300"
          }`}
        >
          Monitoreo Ambiental
        </button>
      </div>

      <div className="space-y-6">
        <div role="tabpanel" aria-hidden={activeTab !== "monitoreo"} className={`${activeTab === "monitoreo" ? "block" : "hidden"}`}>
          <h3 className="text-2xl font-bold mb-4 text-cyan-300">Indicadores</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            <LiquidGauge value={temperature} maxValue={35} label="Temperatura" color="#06b6d4" icon="🌡️" unit="°C" />
            <LiquidGauge value={humidity} maxValue={100} label="Humedad" color="#a855f7" icon="💧" unit="%" />
            <LiquidGauge value={energyUsage} maxValue={500} label="Energía" color="#ec4899" icon="⚡" unit=" kWh" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SimpleCard className="p-6">
              <h4 className="text-lg font-bold mb-4 text-cyan-400">Control de Temperatura</h4>
              <input
                type="range"
                min="10"
                max="35"
                value={temperature}
                onChange={(e) => setTemperature(Number.parseInt(e.target.value))}
                className="w-full h-3 bg-black/30 rounded-lg appearance-none cursor-pointer"
              />
            </SimpleCard>

            <SimpleCard className="p-6">
              <h4 className="text-lg font-bold mb-4 text-purple-400">Control de Humedad</h4>
              <input
                type="range"
                min="20"
                max="80"
                value={humidity}
                onChange={(e) => setHumidity(Number.parseInt(e.target.value))}
                className="w-full h-3 bg-black/30 rounded-lg appearance-none cursor-pointer"
              />
            </SimpleCard>

            <SimpleCard className="p-6">
              <h4 className="text-lg font-bold mb-4 text-pink-400">Control de Energía</h4>
              <input
                type="range"
                min="100"
                max="500"
                value={energyUsage}
                onChange={(e) => setEnergyUsage(Number.parseInt(e.target.value))}
                className="w-full h-3 bg-black/30 rounded-lg appearance-none cursor-pointer"
              />
            </SimpleCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SimpleCard className="p-6">
              <h3 className="text-xl font-bold mb-4 text-green-400">Calidad del Aire</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>CO2:</span><span className="text-green-400">420 ppm - Excelente</span></div>
                <div className="flex justify-between"><span>PM2.5:</span><span className="text-green-400">12 μg/m³ - Bueno</span></div>
                <div className="flex justify-between"><span>VOCs:</span><span className="text-yellow-400">0.3 mg/m³ - Moderado</span></div>
              </div>
            </SimpleCard>

            <SimpleCard className="p-6">
              <h3 className="text-xl font-bold mb-4 text-blue-400">Recomendaciones</h3>
              <div className="space-y-2 text-sm">
                <p>• Temperatura ideal: 20-24°C</p>
                <p>• Humedad óptima: 40-60%</p>
                <p>• Ventilar cada 2 horas</p>
                <p>• Mantén consumo en rango eficiente</p>
              </div>
            </SimpleCard>
          </div>
        </div>

        <div role="tabpanel" aria-hidden={activeTab !== "seguridad"} className={`${activeTab === "seguridad" ? "block" : "hidden"}`}>
          <h3 className="text-2xl font-bold mb-4 text-yellow-300">Controles de Seguridad</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SimpleCard className="p-6">
              <div className="text-center">
                <div className="text-4xl mb-2">🛡️</div>
                <h3 className="text-xl font-bold mb-2 text-green-400">Sistema Armado</h3>
                <SimpleButton onClick={() => setSecurityOn(!securityOn)} active={securityOn} className={securityOn ? "bg-green-500" : "bg-red-500"}>
                  {securityOn ? "ACTIVADO" : "DESACTIVADO"}
                </SimpleButton>
              </div>
            </SimpleCard>

            <SimpleCard className="p-6">
              <div className="text-center">
                <div className="text-4xl mb-2">📹</div>
                <h3 className="text-xl font-bold mb-2 text-blue-400">Cámaras</h3>
                <SimpleButton onClick={() => setCameraOn(!cameraOn)} active={cameraOn} className={cameraOn ? "bg-green-500" : "bg-red-500"}>
                  {cameraOn ? "ACTIVAS" : "INACTIVAS"}
                </SimpleButton>
              </div>
            </SimpleCard>

            <SimpleCard className="p-6">
              <div className="text-center">
                <div className="text-4xl mb-2">🚨</div>
                <h3 className="text-xl font-bold mb-2 text-yellow-400">Alertas</h3>
                <p className="text-2xl font-bold text-green-400">0 Activas</p>
              </div>
            </SimpleCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 mt-4">
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
