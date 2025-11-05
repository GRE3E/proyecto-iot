  "use client";
import { Home} from "lucide-react";
import AnimatedClockWidget from "../components/widgets/AnimatedClockWidget";
import SimpleCard from "../components/UI/Card";
import ProfileNotifications from "../components/UI/ProfileNotifications";
// utils
import { generateSparklinePoints, donutParams } from "../utils/chatUtils";
// MiniChat
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
  const sparkPoints = generateSparklinePoints([110, 130, 125, 140, 155, 150, energyUsage]);
  const tempSparkPoints = generateSparklinePoints([18,20,22,24,temperature]);
  const humiditySparkPoints = generateSparklinePoints([40,42,43,44,humidity]);
  const humidityDonut = donutParams(Math.round(humidity));
  const tempDonut = donutParams(Math.round((temperature / 35) * 100));

  // Umbrales (valores por defecto, se pueden parametrizar)
  const ENERGY_THRESHOLD = 400; // kWh
  const TEMP_THRESHOLD = 28; // °C
  const HUMIDITY_LOW = 30; // %
  const HUMIDITY_HIGH = 70; // %

  const energyHigh = energyUsage > ENERGY_THRESHOLD;
  const tempHigh = temperature > TEMP_THRESHOLD;
  const humidityLow = humidity < HUMIDITY_LOW;
  const humidityHigh = humidity > HUMIDITY_HIGH;
  const humidityOutOfRange = humidityLow || humidityHigh;

  return (
    <div className="p-2 md:p-4 pt-8 md:pt-3 space-y-4 md:space-y-6 lg:space-y-8 font-inter">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 -mt-1 md:-mt-2 relative">
        <div className="flex items-center gap-4 -mt-6 md:-mt-7">
          <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/20">
            <Home className="w-8 md:w-10 h-8 md:h-10 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold bg-gnd radient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent tracking-tight translate-y-[0px] md:translate-y-[-4px]">
            Bienvenido
          </h2>
        </div>

        {/* Perfil + Notificaciones */}
        <ProfileNotifications />
      </div>

      {/* Reloj Inteligente */}
      <div className="mb-6 md:mb-10">
        {/* Left-align the widget so it lines up with the "Panel de métricas" heading below */}
        <AnimatedClockWidget temperature={temperature} />
      </div>

      {/* Panel de métricas */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-xl md:text-2xl font-semibold text-slate-200 mb-4 font-inter tracking-tight">Panel de métricas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Energía */}
          <SimpleCard className="p-4 md:p-6 lg:p-8 min-h-[160px] bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-400/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Energía (24h)</p>
                <div className="flex items-center gap-2">
                  <p className={`text-3xl md:text-4xl font-extrabold ${energyHigh ? 'text-rose-400' : 'text-white'} font-inter`}>{energyUsage} kWh</p>
                  {energyHigh && <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-rose-600/20 text-rose-300">Alto</span>}
                </div>
                <p className="text-xs text-slate-500 mt-2 font-bold">Consumo total reciente</p>
              </div>
              <div className="ml-auto self-center">
                <svg viewBox="0 0 100 100" className="w-36 md:w-44 h-8 md:h-10">
                  <polyline fill="none" stroke="#06b6d4" strokeWidth={2} points={sparkPoints} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </SimpleCard>

          {/* Temperatura */}
          <SimpleCard className="p-4 md:p-6 lg:p-8 min-h-[160px] bg-gradient-to-br from-orange-900/40 to-red-900/40 border-orange-400/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Temperatura</p>
                <div className="flex items-center gap-2">
                  <p className={`text-3xl md:text-4xl font-extrabold ${tempHigh ? 'text-rose-400' : 'text-white'} font-inter`}>{temperature}°C</p>
                  {tempHigh && <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-rose-600/20 text-rose-300">Caliente</span>}
                </div>
                <p className="text-xs text-slate-500 mt-2 font-bold">Promedio interior</p>
              </div>
              <div className="ml-auto self-center">
                <svg viewBox="0 0 48 48" className="w-16 md:w-18 h-16 md:h-18">
                  <circle cx="24" cy="24" r={tempDonut.radius} fill="transparent" stroke="#0f172a" strokeWidth={6} />
                  <circle cx="24" cy="24" r={tempDonut.radius} fill="transparent" stroke="#a78bfa" strokeWidth={6}
                    strokeDasharray={`${tempDonut.dash} ${tempDonut.circumference - tempDonut.dash}`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                  <text x="24" y="28" textAnchor="middle" fontSize="10" fill="#e6edf3">{Math.round((temperature/35)*100)}%</text>
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <svg viewBox="0 0 100 30" className="w-28 md:w-36 h-6">
                <polyline fill="none" stroke="#fb7185" strokeWidth={2} points={tempSparkPoints} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </SimpleCard>

          {/* Humedad */}
          <SimpleCard className="p-4 md:p-6 lg:p-8 min-h-[160px] bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-blue-400/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Humedad</p>
                <div className="flex items-center gap-2">
                  <p className={`text-3xl md:text-4xl font-extrabold ${humidityOutOfRange ? 'text-rose-400' : 'text-white'} font-inter`}>{humidity}%</p>
                  {humidityLow && <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-amber-600/20 text-amber-300">Baja</span>}
                  {humidityHigh && <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-rose-600/20 text-rose-300">Alta</span>}
                </div>
                <p className="text-xs text-slate-500 mt-2 font-bold">Hogar</p>
              </div>
              <div className="ml-auto self-center">
                <svg viewBox="0 0 48 48" className="w-16 md:w-18 h-16 md:h-18">
                  <circle cx="24" cy="24" r={humidityDonut.radius} fill="transparent" stroke="#0f172a" strokeWidth={6} />
                  <circle cx="24" cy="24" r={humidityDonut.radius} fill="transparent" stroke="#a78bfa" strokeWidth={6}
                    strokeDasharray={`${humidityDonut.dash} ${humidityDonut.circumference - humidityDonut.dash}`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                  <text x="24" y="28" textAnchor="middle" fontSize="10" fill="#e6edf3">{Math.round(humidity)}%</text>
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <svg viewBox="0 0 100 100" className="w-28 md:w-36 h-8 md:h-10">
                <polyline fill="none" stroke="#06b6d4" strokeWidth={2} points={humiditySparkPoints} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </SimpleCard>

          {/* Dispositivos */}
          <SimpleCard className="p-4 md:p-6 lg:p-8 min-h-[160px] bg-gradient-to-br from-purple-900/40 to-violet-900/40 border-purple-400/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Dispositivos</p>
                <p className="text-2xl md:text-3xl font-extrabold text-white font-inter">{devices.filter((d)=>d.on).length}/{devices.length}</p>
                <p className="text-xs text-slate-500 mt-2 font-bold">Estado activos</p>
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
      {/* MiniChat flotante */}
      <MiniChat />
    </div>
  );
}