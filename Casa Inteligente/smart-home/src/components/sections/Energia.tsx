"use client"

import SimpleCard from "../UI/SimpleCard"

interface Device {
  name: string
  power: string
  on: boolean
}

interface Props {
  energyUsage: number
  setEnergyUsage: (v: number) => void
  devices: Device[]
}

export default function Energia({ energyUsage, setEnergyUsage, devices }: Props) {
  return (
    <div>
      <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
        ⚡ Gestión de Energía
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Consumo actual */}
        <SimpleCard className="p-8">
          <h3 className="text-3xl font-bold mb-6 text-pink-400">Consumo actual: {energyUsage} kWh</h3>
          <div className="space-y-6">
            <input
              type="range"
              min="100"
              max="500"
              value={energyUsage}
              onChange={(e) => setEnergyUsage(Number.parseInt(e.target.value))}
              className="w-full h-4 bg-black/30 rounded-lg appearance-none cursor-pointer"
            />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-green-400 font-bold">Eficiente</p>
                <p className="text-sm">100-200 kWh</p>
              </div>
              <div>
                <p className="text-yellow-400 font-bold">Moderado</p>
                <p className="text-sm">200-350 kWh</p>
              </div>
              <div>
                <p className="text-red-400 font-bold">Alto</p>
                <p className="text-sm">350-500 kWh</p>
              </div>
            </div>
          </div>
        </SimpleCard>

        {/* Costo estimado */}
        <SimpleCard className="p-8">
          <h3 className="text-2xl font-bold mb-4 text-green-400">💰 Costo Estimado</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-lg">
              <span>Hoy:</span>
              <span className="text-green-400">$12.50</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Este mes:</span>
              <span className="text-yellow-400">$285.30</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Proyección anual:</span>
              <span className="text-red-400">$3,420.00</span>
            </div>
          </div>
        </SimpleCard>
      </div>

      {/* Consumo por dispositivo */}
      <SimpleCard className="p-6">
        <h3 className="text-xl font-bold mb-4 text-blue-400">📊 Consumo por Dispositivo</h3>
        <div className="space-y-3">
          {devices
            .filter((d) => d.on)
            .map((device, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-slate-800/30 rounded-lg">
                <span>{device.name}</span>
                <span className="text-blue-400">{device.power}</span>
              </div>
            ))}
        </div>
      </SimpleCard>
    </div>
  )
}
