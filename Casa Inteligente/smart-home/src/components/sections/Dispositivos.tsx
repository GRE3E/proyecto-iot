"use client"

import SimpleCard from "../UI/SimpleCard"
import SimpleButton from "../UI/SimpleButton"

interface Device {
  name: string
  location?: string
  power: string
  on: boolean
}

interface Props {
  devices: Device[]
  setDevices: (d: Device[]) => void
  energyUsage: number
  filter: string
  setFilter: (f: string) => void
}

export default function Dispositivos({ devices, setDevices, energyUsage, filter, setFilter }: Props) {
  return (
    <div>
      <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
        📱 Control de Dispositivos
      </h2>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SimpleCard className="p-4 text-center">
          <div className="text-2xl mb-1">✅</div>
          <p className="text-sm text-green-400">Dispositivos Activos</p>
          <p className="text-2xl font-bold text-green-400">{devices.filter((d) => d.on).length}</p>
        </SimpleCard>
        <SimpleCard className="p-4 text-center">
          <div className="text-2xl mb-1">❌</div>
          <p className="text-sm text-red-400">Dispositivos Inactivos</p>
          <p className="text-2xl font-bold text-red-400">{devices.filter((d) => !d.on).length}</p>
        </SimpleCard>
        <SimpleCard className="p-4 text-center">
          <div className="text-2xl mb-1">⚡</div>
          <p className="text-sm text-yellow-400">Consumo Total</p>
          <p className="text-2xl font-bold text-yellow-400">{energyUsage}W</p>
        </SimpleCard>
        <SimpleCard className="p-4 text-center">
          <div className="text-2xl mb-1">🏠</div>
          <p className="text-sm text-blue-400">Total Dispositivos</p>
          <p className="text-2xl font-bold text-blue-400">{devices.length}</p>
        </SimpleCard>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-4 flex-wrap">
        {["Todos", "Encendidos", "Apagados"].map((f) => (
          <SimpleButton key={f} onClick={() => setFilter(f)} active={filter === f}>
            {f}
          </SimpleButton>
        ))}
      </div>

      {/* Lista de dispositivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices
          .filter((d) => filter === "Todos" || (filter === "Encendidos" && d.on) || (filter === "Apagados" && !d.on))
          .map((device, i) => (
            <SimpleCard key={i} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <span className="text-xl font-semibold block">{device.name}</span>
                  <p className="text-sm text-slate-400 mt-1">📍 {device.location}</p>
                  <p className="text-sm text-slate-400">⚡ {device.power}</p>
                  <div className={`mt-2 w-3 h-3 rounded-full ${device.on ? "bg-green-500" : "bg-red-500"}`} />
                </div>
                <SimpleButton
                  onClick={() => {
                    const updated = [...devices]
                    updated[i].on = !updated[i].on
                    setDevices(updated)
                  }}
                  active={device.on}
                  className={device.on ? "bg-green-500" : "bg-red-500"}
                >
                  {device.on ? "ON" : "OFF"}
                </SimpleButton>
              </div>
            </SimpleCard>
          ))}
      </div>
    </div>
  )
}
