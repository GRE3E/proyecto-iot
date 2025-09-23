"use client"

import SimpleCard from "../UI/SimpleCard"
import AnimatedClockWidget from "../widgets/AnimatedClockWidget"
import Perfil from "./Perfil"
import { IconHome, IconBell, IconSettings, IconThermostat, IconBolt, IconPlug, IconLight, IconPin } from "../UI/Icons"
// Casa3d removed: this view is charts-only now
// LiquidGauge was removed from this view (charts-only) to avoid duplicates

// Inline charts (reusable)
function Sparkline({ values = [10, 12, 8, 14, 18, 16] }: { values?: number[] }) {
  const max = Math.max(...values);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 100}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" className="w-32 h-8">
      <polyline fill="none" stroke="#06b6d4" strokeWidth={2} points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Donut({ percent = 65 }: { percent?: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;
  return (
    <svg viewBox="0 0 48 48" className="w-14 h-14">
      <circle cx="24" cy="24" r={r} fill="transparent" stroke="#0f172a" strokeWidth={6} />
      <circle cx="24" cy="24" r={r} fill="transparent" stroke="#a78bfa" strokeWidth={6} strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" transform="rotate(-90 24 24)" />
      <text x="24" y="28" textAnchor="middle" fontSize="10" fill="#e6edf3">{percent}%</text>
    </svg>
  );
}

function MiniBars({ values = [20, 40, 60, 50, 80] }: { values?: number[] }) {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-1 h-10">
      {values.map((v, i) => (
        <div key={i} style={{ height: `${(v / max) * 100}%` }} className="w-1.5 bg-gradient-to-b from-pink-400 to-rose-400 rounded" />
      ))}
    </div>
  );
}

// Tipos
interface Device {
  name: string
  location?: string
  power: string
  on: boolean
}

interface InicioProps {
  temperature?: number
  humidity?: number
  energyUsage?: number
  devices?: Device[]
  lightOn?: boolean
  securityOn?: boolean
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
}: InicioProps) {
  return (
    <div className="p-4 space-y-8">
      <div className="flex items-center gap-4 mb-8 relative">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/20">
          <IconHome className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          Bienvenido
        </h2>
  {/* profile in header corner (compact) */}
  <Perfil compact />
      </div>

      {/* --- Top row: clock + notifications --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <SimpleCard className="p-4">
            <AnimatedClockWidget />
          </SimpleCard>
        </div>
        <div>
          <SimpleCard className="p-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-slate-800/30">
                <IconBell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-sm text-slate-300">Notificaciones</h4>
                <p className="text-sm text-slate-400">No tienes nuevas notificaciones</p>
              </div>
            </div>
          </SimpleCard>
        </div>
        <div>
          <SimpleCard className="p-4">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800/30">
                <IconSettings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-sm text-slate-300">Quick actions</h4>
                <p className="text-sm text-slate-400">Atajos y estados</p>
              </div>
            </div>
          </SimpleCard>
        </div>
      </div>

      {/* --- Dashboard único: charts-only, futurista y elegante --- */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-slate-200 mb-4">Panel de métricas</h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <SimpleCard className="p-6 bg-gradient-to-br from-slate-900/60 to-slate-800/50 backdrop-blur-lg border border-white/5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Energía (24h)</p>
                <p className="text-3xl font-extrabold text-white">{energyUsage} kWh</p>
                <p className="text-xs text-slate-500 mt-2">Consumo total reciente</p>
              </div>
              <div className="ml-auto self-center">
                <Sparkline values={[110, 130, 125, 140, 155, 150, energyUsage]} />
              </div>
            </div>
          </SimpleCard>

          <SimpleCard className="p-6 bg-gradient-to-br from-violet-900/50 to-indigo-800/40 backdrop-blur-lg border border-white/5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Temperatura</p>
                <p className="text-3xl font-extrabold text-white">{temperature}°C</p>
                <p className="text-xs text-slate-500 mt-2">Promedio interior</p>
              </div>
                <div className="ml-auto self-center">
                <Donut percent={Math.round((temperature / 35) * 100)} />
              </div>
            </div>
            <div className="mt-4">
              <MiniBars values={[18, 20, 22, 24, temperature]} />
            </div>
          </SimpleCard>

          <SimpleCard className="p-6 bg-gradient-to-br from-cyan-900/40 to-sky-800/30 backdrop-blur-lg border border-white/5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Humedad</p>
                <p className="text-3xl font-extrabold text-white">{humidity}%</p>
                <p className="text-xs text-slate-500 mt-2">Hogar</p>
              </div>
                <div className="ml-auto self-center">
                <Donut percent={Math.round(humidity)} />
              </div>
            </div>
            <div className="mt-4">
              <Sparkline values={[40, 42, 43, 44, humidity]} />
            </div>
          </SimpleCard>

          <SimpleCard className="p-6 bg-gradient-to-br from-rose-900/30 to-pink-800/30 backdrop-blur-lg border border-white/5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Dispositivos</p>
                <p className="text-3xl font-extrabold text-white">{devices.filter((d) => d.on).length}/{devices.length}</p>
                <p className="text-xs text-slate-500 mt-2">Estado activos</p>
              </div>
              <div className="ml-auto self-center">
                <MiniBars values={devices.map((d) => (d.on ? 100 : 20))} />
              </div>
            </div>
          </SimpleCard>
        </div>

        {/* Gauges row removed — metrics displayed above as charts to avoid duplication */}
      </div>

      <div className="space-y-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-slate-600/20 to-slate-700/20 backdrop-blur-sm">
            <IconSettings className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-200">Dispositivos</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-600/50 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device, i) => (
            <SimpleCard
              key={i}
              className="p-6 hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden border-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm"
            >
              <div
                className={`absolute top-4 right-4 w-3 h-3 rounded-full transition-all duration-300 ${
                  device.on
                    ? "bg-green-500 shadow-lg shadow-green-500/50 animate-pulse"
                    : "bg-red-500/70 shadow-lg shadow-red-500/30"
                }`}
              />

              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                  device.on
                    ? "bg-gradient-to-br from-green-500/5 to-emerald-500/5"
                    : "bg-gradient-to-br from-red-500/5 to-rose-500/5"
                }`}
              />

              <div className="relative space-y-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl transition-all duration-300 backdrop-blur-sm ${
                      device.on
                        ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 group-hover:from-green-500/30 group-hover:to-emerald-500/30"
                        : "bg-gradient-to-br from-slate-600/20 to-slate-700/20 group-hover:from-slate-600/30 group-hover:to-slate-700/30"
                    }`}
                  >
                    <span className="text-2xl">
                      {device.name.includes("Luz") || device.name.includes("Bombillo")
                        ? <IconLight className="w-6 h-6 text-white" />
                        : device.name.includes("Aire")
                          ? <IconThermostat className="w-6 h-6 text-white" />
                          : <IconPlug className="w-6 h-6 text-white" />}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-200 group-hover:text-white transition-colors duration-300 truncate">
                      {device.name}
                    </h3>
                    <p
                      className={`text-sm font-medium transition-colors duration-300 ${
                        device.on ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {device.on ? "Encendido" : "Apagado"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-slate-600/30 group-hover:border-slate-500/50 transition-colors duration-300">
                  <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                      <div className="p-1 rounded bg-slate-700/50">
                      <IconPin className="w-4 h-4 text-slate-300" />
                    </div>
                    <span className="text-sm font-medium">{device.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                      <div className="p-1 rounded bg-slate-700/50">
                      <IconBolt className="w-4 h-4 text-slate-300" />
                    </div>
                    <span className="text-sm font-mono font-medium">{device.power}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                    <span className="font-medium">Consumo actual</span>
                    <span className="font-mono">{device.on ? device.power : "0W"}</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ease-out ${
                        device.on
                          ? "bg-gradient-to-r from-green-500 via-emerald-400 to-green-300 shadow-sm shadow-green-500/30"
                          : "bg-slate-600/50"
                      }`}
                      style={{
                        width: device.on ? `${Math.min((Number.parseInt(device.power) / 1500) * 100, 100)}%` : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </SimpleCard>
          ))}
        </div>
      </div>
    </div>
  )
}
