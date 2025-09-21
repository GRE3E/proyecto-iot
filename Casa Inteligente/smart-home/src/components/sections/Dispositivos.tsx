"use client"

import SimpleCard from "../UI/SimpleCard"

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SimpleCard className="p-6 text-center group hover:scale-105 transition-all duration-300 hover:bg-gradient-to-br hover:from-green-500/10 hover:to-emerald-600/10 border border-green-500/20">
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:shadow-green-500/25 transition-all duration-300">
            ✓
          </div>
          <p className="text-sm text-green-400 font-medium mb-1">Dispositivos Activos</p>
          <p className="text-3xl font-bold text-green-400 group-hover:text-green-300 transition-colors">
            {devices.filter((d) => d.on).length}
          </p>
        </SimpleCard>

        <SimpleCard className="p-6 text-center group hover:scale-105 transition-all duration-300 hover:bg-gradient-to-br hover:from-red-500/10 hover:to-rose-600/10 border border-red-500/20">
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-red-400 to-rose-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:shadow-red-500/25 transition-all duration-300">
            ✕
          </div>
          <p className="text-sm text-red-400 font-medium mb-1">Dispositivos Inactivos</p>
          <p className="text-3xl font-bold text-red-400 group-hover:text-red-300 transition-colors">
            {devices.filter((d) => !d.on).length}
          </p>
        </SimpleCard>

        <SimpleCard className="p-6 text-center group hover:scale-105 transition-all duration-300 hover:bg-gradient-to-br hover:from-yellow-500/10 hover:to-amber-600/10 border border-yellow-500/20">
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:shadow-yellow-500/25 transition-all duration-300">
            ⚡
          </div>
          <p className="text-sm text-yellow-400 font-medium mb-1">Consumo Total</p>
          <p className="text-3xl font-bold text-yellow-400 group-hover:text-yellow-300 transition-colors">
            {energyUsage}W
          </p>
        </SimpleCard>

        <SimpleCard className="p-6 text-center group hover:scale-105 transition-all duration-300 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-cyan-600/10 border border-blue-500/20">
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
            🏠
          </div>
          <p className="text-sm text-blue-400 font-medium mb-1">Total Dispositivos</p>
          <p className="text-3xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
            {devices.length}
          </p>
        </SimpleCard>
      </div>

      <div className="mb-8 flex gap-3 flex-wrap">
        {[
          { name: "Todos", icon: "📋", color: "purple" },
          { name: "Encendidos", icon: "✅", color: "green" },
          { name: "Apagados", icon: "❌", color: "red" },
        ].map((f) => (
          <button
            key={f.name}
            onClick={() => setFilter(f.name)}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
              filter === f.name
                ? f.color === "purple"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                  : f.color === "green"
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25"
                    : "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25"
                : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-600/30"
            }`}
          >
            <span className="text-sm">{f.icon}</span>
            {f.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices
          .filter((d) => filter === "Todos" || (filter === "Encendidos" && d.on) || (filter === "Apagados" && !d.on))
          .map((device, i) => (
            <SimpleCard
              key={i}
              className={`p-6 group hover:scale-105 transition-all duration-300 border ${
                device.on
                  ? "border-green-500/30 hover:bg-gradient-to-br hover:from-green-500/5 hover:to-emerald-600/5"
                  : "border-red-500/30 hover:bg-gradient-to-br hover:from-red-500/5 hover:to-rose-600/5"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-md transition-all duration-300 ${
                        device.on
                          ? "bg-gradient-to-br from-green-400 to-emerald-500 group-hover:shadow-green-500/25"
                          : "bg-gradient-to-br from-slate-500 to-slate-600 group-hover:shadow-slate-500/25"
                      }`}
                    >
                      {device.on ? "⚡" : "💤"}
                    </div>
                    <div>
                      <span className="text-xl font-semibold block text-white group-hover:text-slate-100 transition-colors">
                        {device.name}
                      </span>
                      <div
                        className={`mt-1 px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                          device.on
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${device.on ? "bg-green-400" : "bg-red-400"}`} />
                        {device.on ? "ACTIVO" : "INACTIVO"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 ml-13">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span className="w-4 h-4 bg-slate-700 rounded flex items-center justify-center text-xs">📍</span>
                      {device.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span className="w-4 h-4 bg-slate-700 rounded flex items-center justify-center text-xs">⚡</span>
                      {device.power}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const updated = [...devices]
                    updated[i].on = !updated[i].on
                    setDevices(updated)
                  }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                    device.on
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400 shadow-green-500/25"
                      : "bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-400 hover:to-rose-400 shadow-red-500/25"
                  }`}
                >
                  {device.on ? "ON" : "OFF"}
                </button>
              </div>
            </SimpleCard>
          ))}
      </div>
    </div>
  )
}
