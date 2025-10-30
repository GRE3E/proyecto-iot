"use client";
import { Home, Bell, X, Activity, Lightbulb, Thermometer, Plug, MapPin, Zap } from "lucide-react";
import AnimatedClockWidget from "../components/widgets/AnimatedClockWidget";
import SimpleCard from "../components/UI/Card";
// utils (solo lógica)
import { generateSparklinePoints, donutParams } from "../utils/chatUtils";
import { initialNotifications } from "../utils/notificationsUtils";
import { getDeviceType } from "../utils/deviceUtils";
// hook (React)
import { useNotifications } from "../hooks/useNotification";
import MiniChat from "../components/widgets/MiniChat";

interface Device {
  name: string;
  location?: string;
  power: string;
  on: boolean;
}

export default function Inicio({
  temperature = 24,
  humidity = 45,
  energyUsage = 320,
  devices = [
    { name: "Luz Sala", location: "Sala", power: "60W", on: true },
    { name: "Aire Acondicionado", location: "Dormitorio", power: "1500W", on: false },
    { name: "Bombilla Cocina", location: "Cocina", power: "40W", on: true },
  ],
}: {
  temperature?: number;
  humidity?: number;
  energyUsage?: number;
  devices?: Device[];
}) {
  const { notifications, open, closing, remove, clearAll, toggle } = useNotifications(initialNotifications);
  const sparkPoints = generateSparklinePoints([110, 130, 125, 140, 155, 150, energyUsage]);
  const humidityDonut = donutParams(Math.round(humidity));
  const tempDonut = donutParams(Math.round((temperature / 35) * 100));

  const renderIcon = (name: string) => {
    const type = getDeviceType(name);
    if (type === "light") return <Lightbulb className="w-5 md:w-6 h-5 md:h-6 text-white" />;
    if (type === "ac") return <Thermometer className="w-5 md:w-6 h-5 md:h-6 text-white" />;
    if (type === "plug") return <Plug className="w-5 md:w-6 h-5 md:h-6 text-white" />;
    return <Plug className="w-5 md:w-6 h-5 md:h-6 text-white" />;
  };

  return (
    <div className="p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 -mt-1 md:-mt-2 relative">
        <div className="flex items-center gap-4 -mt-6 md:-mt-7">
          <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/20">
            <Home className="w-8 md:w-10 h-8 md:h-10 text-white" />
          </div>
          {/* Ajuste responsive del texto Bienvenido */}
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent tracking-tight translate-y-[0px] md:translate-y-[-4px]">
            Bienvenido
          </h2>
        </div>

        {/* Perfil + Notificaciones */}
        <div className="flex items-center gap-4 relative">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/30 border border-slate-600/20">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">U</div>
            <span className="text-sm text-slate-200">Usuario</span>
          </div>
          <div className="relative">
            <button
              onClick={toggle}
              className="relative p-2 md:p-3 rounded-xl bg-slate-800/30 hover:bg-slate-700/40 transition-colors border border-slate-600/20"
            >
              <Bell className="w-5 md:w-6 h-5 md:h-6 text-white" />
              {notifications.length > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="absolute -bottom-1 -right-1 text-xs font-bold text-red-400">{notifications.length}</span>
                </>
              )}
            </button>
            {open && (
              <div
                className={`absolute right-0 mt-3 w-80 bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/40 p-4 z-50 ${
                  closing ? "opacity-0" : "opacity-100"
                } transition-opacity duration-300`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-slate-200 tracking-wide">Notificaciones</h4>
                  <button onClick={clearAll} className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No tienes notificaciones</p>
                ) : (
                  <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {notifications.map((n) => (
                      <li key={n.id} className="relative p-3 rounded-lg bg-slate-800/60 border border-slate-700/40 shadow-sm hover:shadow-md transition-all">
                        <p className="text-sm text-slate-200">{n.message}</p>
                        <button onClick={() => remove(n.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reloj Inteligente Futurista */}
      <div className="mb-6 md:mb-10">
        <div className="max-w-8xl mx-auto">
          <AnimatedClockWidget temperature={temperature} />
        </div>
      </div>

      {/* Panel de métricas */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-xl md:text-2xl font-semibold text-slate-200 mb-4 font-inter tracking-tight">Panel de métricas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Energía */}
          <SimpleCard className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Energía (24h)</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white font-inter">{energyUsage} kWh</p>
                <p className="text-xs text-slate-500 mt-2">Consumo total reciente</p>
              </div>
              <div className="ml-auto self-center">
                <svg viewBox="0 0 100 100" className="w-24 md:w-32 h-6 md:h-8">
                  <polyline fill="none" stroke="#06b6d4" strokeWidth={2} points={sparkPoints} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </SimpleCard>

          {/* Temperatura */}
          <SimpleCard className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Temperatura</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white font-inter">{temperature}°C</p>
                <p className="text-xs text-slate-500 mt-2">Promedio interior</p>
              </div>
              <div className="ml-auto self-center">
                <svg viewBox="0 0 48 48" className="w-12 md:w-14 h-12 md:h-14">
                  <circle cx="24" cy="24" r={tempDonut.radius} fill="transparent" stroke="#0f172a" strokeWidth={6} />
                  <circle cx="24" cy="24" r={tempDonut.radius} fill="transparent" stroke="#a78bfa" strokeWidth={6}
                    strokeDasharray={`${tempDonut.dash} ${tempDonut.circumference - tempDonut.dash}`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                  <text x="24" y="28" textAnchor="middle" fontSize="10" fill="#e6edf3">{Math.round((temperature/35)*100)}%</text>
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-end gap-1 h-8 md:h-10">
                {[18,20,22,24,temperature].map((v,i)=>(
                  <div key={i} style={{ height: `${(v/Math.max(temperature,1))*100}%` }} className="w-1 md:w-1.5 bg-gradient-to-b from-pink-400 to-rose-400 rounded" />
                ))}
              </div>
            </div>
          </SimpleCard>

          {/* Humedad */}
          <SimpleCard className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Humedad</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white font-inter">{humidity}%</p>
                <p className="text-xs text-slate-500 mt-2">Hogar</p>
              </div>
              <div className="ml-auto self-center">
                <svg viewBox="0 0 48 48" className="w-12 md:w-14 h-12 md:h-14">
                  <circle cx="24" cy="24" r={humidityDonut.radius} fill="transparent" stroke="#0f172a" strokeWidth={6} />
                  <circle cx="24" cy="24" r={humidityDonut.radius} fill="transparent" stroke="#a78bfa" strokeWidth={6}
                    strokeDasharray={`${humidityDonut.dash} ${humidityDonut.circumference - humidityDonut.dash}`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                  <text x="24" y="28" textAnchor="middle" fontSize="10" fill="#e6edf3">{Math.round(humidity)}%</text>
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <svg viewBox="0 0 100 100" className="w-24 md:w-32 h-6 md:h-8">
                <polyline fill="none" stroke="#06b6d4" strokeWidth={2} points={generateSparklinePoints([40,42,43,44,humidity])} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </SimpleCard>

          {/* Dispositivos */}
          <SimpleCard className="p-4 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Dispositivos</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white font-inter">{devices.filter((d)=>d.on).length}/{devices.length}</p>
                <p className="text-xs text-slate-500 mt-2">Estado activos</p>
              </div>
              <div className="ml-auto self-center">
                <div className="flex items-end gap-1 h-8 md:h-10">
                  {devices.map((d,i)=>(
                    <div key={i} style={{ height: `${(d.on?100:20)}%` }} className="w-1 md:w-1.5 bg-gradient-to-b from-pink-400 to-rose-400 rounded" />
                  ))}
                </div>
              </div>
            </div>
          </SimpleCard>
        </div>
      </div>

      {/* Devices list (full) */}
      <div className="space-y-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-slate-600/20 to-slate-700/20 backdrop-blur-sm">
            <Activity className="w-5 md:w-6 h-5 md:h-6 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-semibold text-slate-200 font-inter tracking-tight">Dispositivos</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-600/50 to-transparent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {devices.map((device, i) => (
            <SimpleCard key={i} className="p-4 md:p-6 hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden border-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm">
              <div className={`absolute top-4 right-4 w-3 h-3 rounded-full transition-all duration-300 ${device.on ? "bg-green-500 shadow-lg shadow-green-500/50 animate-pulse" : "bg-red-500/70 shadow-lg shadow-red-500/30"}`} />
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${device.on ? "bg-gradient-to-br from-green-500/5 to-emerald-500/5" : "bg-gradient-to-br from-red-500/5 to-rose-500/5"}`} />
              <div className="relative space-y-4">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className={`p-2 md:p-3 rounded-xl transition-all duration-300 backdrop-blur-sm ${device.on ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 group-hover:from-green-500/30 group-hover:to-emerald-500/30" : "bg-gradient-to-br from-slate-600/20 to-slate-700/20 group-hover:from-slate-600/30 group-hover:to-slate-700/30"}`}>
                    {renderIcon(device.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-slate-200 group-hover:text-white transition-colors duration-300 truncate font-inter">{device.name}</h3>
                    <p className={`text-sm font-medium transition-colors duration-300 ${device.on ? "text-green-400" : "text-red-400"}`}>{device.on ? "Encendido" : "Apagado"}</p>
                  </div>
                </div>
                <div className="space-y-3 pl-4 border-l-2 border-slate-600/30 group-hover:border-slate-500/50 transition-colors duration-300">
                  {device.location && <div className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-slate-300 transition-colors"><MapPin className="w-3.5 h-3.5" />{device.location}</div>}
                  <div className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-slate-300 transition-colors"><Zap className="w-3.5 h-3.5" />{device.power}</div>
                </div>
              </div>
            </SimpleCard>
          ))}
        </div>
      </div>

      {/* MiniChat flotante */}
      <MiniChat />
    </div>
  );
}