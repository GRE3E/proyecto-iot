"use client"

import SimpleCard from "../UI/SimpleCard"
import LiquidGauge from "../widgets/LiquidGauge"

interface Props {
  temperature: number
  setTemperature: (v: number) => void
  humidity: number
  setHumidity: (v: number) => void
  energyUsage: number
  setEnergyUsage: (v: number) => void
}

export default function Monitoreo({
  temperature,
  setTemperature,
  humidity,
  setHumidity,
  energyUsage,
  setEnergyUsage,
}: Props) {
  return (
    <div>
      <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
        📊 Monitoreo Ambiental
      </h2>

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <LiquidGauge value={temperature} maxValue={35} label="Temperatura" color="#06b6d4" icon="🌡️" unit="°C" />
        <LiquidGauge value={humidity} maxValue={100} label="Humedad" color="#a855f7" icon="💧" unit="%" />
        <LiquidGauge value={energyUsage} maxValue={500} label="Energía" color="#ec4899" icon="⚡" unit=" kWh" />
      </div>

      {/* Sliders */}
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

      {/* Info extra */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SimpleCard className="p-6">
          <h3 className="text-xl font-bold mb-4 text-green-400">🌿 Calidad del Aire</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>CO2:</span>
              <span className="text-green-400">420 ppm - Excelente</span>
            </div>
            <div className="flex justify-between">
              <span>Partículas PM2.5:</span>
              <span className="text-green-400">12 μg/m³ - Bueno</span>
            </div>
            <div className="flex justify-between">
              <span>VOCs:</span>
              <span className="text-yellow-400">0.3 mg/m³ - Moderado</span>
            </div>
          </div>
        </SimpleCard>

        <SimpleCard className="p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-400">💡 Recomendaciones</h3>
          <div className="space-y-2 text-sm">
            <p>• Temperatura ideal: 20-24°C</p>
            <p>• Humedad óptima: 40-60%</p>
            <p>• Ventilación recomendada cada 2 horas</p>
            <p>• Consumo energético dentro del rango normal</p>
          </div>
        </SimpleCard>
      </div>
    </div>
  )
}
