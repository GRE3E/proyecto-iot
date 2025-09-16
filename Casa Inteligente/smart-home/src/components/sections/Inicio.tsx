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
  temperature: number
  humidity: number
  energyUsage: number
  devices: Device[]
  lightOn: boolean
  securityOn: boolean
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
    <div className="p-4">
      <h2 className="text-4xl font-bold mb-6">🏡 Bienvenido</h2>

      {/* --- Notificaciones y reloj --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
        <AnimatedClockWidget />

        <SimpleCard className="p-6">
          <h2 className="text-xl font-semibold text-cyan-400">🔔 Notificaciones</h2>
          <p className="text-slate-400">No tienes nuevas notificaciones.</p>
        </SimpleCard>

        <SimpleCard className="p-6">
          <h2 className="text-xl font-semibold text-green-400">💡 Estado de luces</h2>
          <p className="text-slate-400">
            {devices.filter(d => d.on).length} encendidos / {devices.length} totales
          </p>
        </SimpleCard>
      </div>

      {/* --- Mini-resúmenes con gauges --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <LiquidGauge value={temperature} maxValue={35} label="Temperatura" color="#06b6d4" icon="🌡️" unit="°C" />
        <LiquidGauge value={humidity} maxValue={100} label="Humedad" color="#a855f7" icon="💧" unit="%" />
        <LiquidGauge value={energyUsage} maxValue={500} label="Energía" color="#ec4899" icon="⚡" unit="kWh" />
      </div>

      {/* --- Mini-preview modelo 3D --- */}
      <div className="mb-8">
        <HouseModel3D lightOn={lightOn} securityOn={securityOn} />
      </div>

      {/* --- Resumen de dispositivos (solo lectura) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device, i) => (
          <SimpleCard key={i} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <span className="text-xl font-semibold block">{device.name}</span>
                <p className="text-sm text-slate-400 mt-1">📍 {device.location}</p>
                <p className="text-sm text-slate-400">⚡ {device.power}</p>
                <div
                  className={`mt-2 w-3 h-3 rounded-full ${
                    device.on ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              </div>
            </div>
          </SimpleCard>
        ))}
      </div>
    </div>
  )
}
