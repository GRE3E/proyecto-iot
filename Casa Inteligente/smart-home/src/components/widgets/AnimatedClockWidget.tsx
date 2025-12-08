"use client";

import SimpleCard from "../UI/Card";
import { Sun, Cloud, CloudRain } from "lucide-react";
import { useTimeData } from "../../hooks/useTimeData";
import { useWeatherData } from "../../hooks/useWeatherData";
import { useThemeByTime } from "../../hooks/useThemeByTime";

export default function AnimatedClockWidget() {
  const { currentTime } = useTimeData();
  const { weather } = useWeatherData();
  const { theme, colors } = useThemeByTime();

  // Formatear hora desde currentTime (actualizado cada segundo)
  const formattedTime = currentTime.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const formattedDate = currentTime.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Usar datos del weather hook o valores por defecto
  const temperature = weather?.temperature ?? 22;
  const humidity = weather?.humidity ?? 47;
  const wind = Math.round(weather?.wind_speed ?? 3);

  // Función para traducir/corregir descripciones de portugués a español
  const translateWeatherDescription = (description: string): string => {
    const translations: Record<string, string> = {
      nuboso: "nublado",
      "muito nuboso": "muy nublado",
      "muy nuboso": "muy nublado",
      "parcialmente nuboso": "parcialmente nublado",
      nublado: "nublado",
      nubes: "nubes",
      "nubes dispersas": "nubes dispersas",
      "lluvia ligera": "lluvia ligera",
      lluvia: "lluvia",
      chuva: "lluvia",
      sol: "despejado",
      despejado: "despejado",
      "cielo despejado": "cielo despejado",
      "cielo claro": "cielo despejado",
    };

    const lowerDesc = description.toLowerCase();
    return translations[lowerDesc] || description;
  };

  // Usar directamente la descripción del API con traducción
  const rawDescription = weather?.description ?? "Agradable";
  const weatherDescription = translateWeatherDescription(rawDescription);
  const weatherLabel =
    weatherDescription.charAt(0).toUpperCase() + weatherDescription.slice(1);

  // Mapeo de weather_code a iconos
  const getWeatherIcon = (code: number) => {
    if (code >= 200 && code < 300) return CloudRain; // Tormenta
    if (code >= 300 && code < 600) return CloudRain; // Lluvia
    if (code >= 600 && code < 700) return Cloud; // Nieve
    if (code >= 801) return Cloud; // Nublado
    return Sun; // Despejado
  };

  // Generar pronóstico desde datos del API (5 días max con API gratuita)
  const forecast = weather?.daily
    ? weather.daily.time.map((date, index) => {
        const dateObj = new Date(date);
        const dayNames = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
        const day = dayNames[dateObj.getDay()];
        const icon = getWeatherIcon(weather.daily!.weather_code[index]);
        const hi = Math.round(weather.daily!.temperature_2m_max[index]);
        const lo = Math.round(weather.daily!.temperature_2m_min[index]);
        return { day, icon, hi, lo };
      })
    : [
        // Fallback si no hay datos del API (5 días)
        { day: "LUN", icon: Cloud, hi: 30, lo: 21 },
        { day: "MAR", icon: Sun, hi: 32, lo: 22 },
        { day: "MIE", icon: Sun, hi: 31, lo: 21 },
        { day: "JUE", icon: CloudRain, hi: 28, lo: 20 },
        { day: "VIE", icon: Sun, hi: 30, lo: 21 },
      ];

  // Extraer horas y minutos para las manecillas del reloj
  const hours = currentTime.getHours() % 12;
  const minutes = currentTime.getMinutes();

  const hourDeg = (hours + minutes / 60) * 30;
  const minuteDeg = minutes * 6;

  return (
    <SimpleCard
      className={`relative overflow-hidden bg-gradient-to-br ${colors.clockBg} border ${colors.clockBorder} p-5 md:p-6 backdrop-blur-md shadow-xl`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.8fr] gap-5 md:gap-6">
        {/* Left: Clock & Date */}
        <div className="flex flex-col items-center justify-center">
          <div
            className={`text-4xl md:text-5xl font-bold font-mono tracking-wider mb-3 ${colors.text}`}
          >
            {formattedTime}
          </div>

          <div
            className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full border-2 ${colors.clockBorder} flex items-center justify-center bg-gradient-to-b ${colors.clockBg} shadow-inner`}
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const numberX = 50 + 36 * Math.sin(angle);
              const numberY = 50 - 36 * Math.cos(angle);
              const number = i === 0 ? 12 : i;
              return (
                <div
                  key={i}
                  className={`absolute text-xs font-bold font-mono ${colors.clockNumbers}`}
                  style={{
                    left: `${numberX}%`,
                    top: `${numberY}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {number}
                </div>
              );
            })}
            <div
              className={`absolute rounded-full ${colors.clockHourHand}`}
              style={{
                width: "2px",
                height: "32%",
                bottom: "50%",
                left: "50%",
                transformOrigin: "bottom center",
                transform: `translateX(-50%) rotate(${hourDeg}deg)`,
                boxShadow: "0 0 4px currentColor",
              }}
            />
            <div
              className={`absolute rounded-full ${colors.clockMinuteHand}`}
              style={{
                width: "1px",
                height: "36%",
                bottom: "50%",
                left: "50%",
                transformOrigin: "bottom center",
                transform: `translateX(-50%) rotate(${minuteDeg}deg)`,
                boxShadow: "0 0 3px currentColor",
              }}
            />
            <div
              className={`absolute w-2 h-2 ${colors.clockCenter} rounded-full shadow-lg`}
            />
          </div>

          <div className={`text-xs font-medium mt-3 ${colors.dateText}`}>
            {formattedDate}
          </div>
        </div>

        {/* Right: Weather */}
        <div
          className={`rounded-xl bg-gradient-to-br ${colors.weatherBg} border ${colors.weatherBorder} p-4 md:p-5 flex flex-col justify-between backdrop-blur-sm`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p
                  className={`text-sm font-medium mb-1 ${colors.weatherLabel}`}
                >
                  Clima
                </p>
                <p
                  className={`text-lg md:text-xl font-bold ${colors.weatherAdvice}`}
                >
                  {weatherLabel}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-2xl md:text-3xl font-bold ${colors.weatherTemperature}`}
                >
                  {temperature}°C
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <div
                className={`flex-1 flex items-center gap-2 bg-gradient-to-r ${
                  theme === "light"
                    ? "from-blue-400/15 to-cyan-400/10"
                    : "from-cyan-500/10 to-blue-500/5"
                } rounded-lg px-3 py-2 border ${colors.weatherBorder}`}
              >
                <div
                  className={`text-xs font-semibold uppercase tracking-wider ${colors.weatherHumidity}`}
                >
                  {humidity}%
                </div>
              </div>
              <div
                className={`flex-1 flex items-center gap-2 bg-gradient-to-r ${
                  theme === "light"
                    ? "from-blue-400/15 to-cyan-400/10"
                    : "from-cyan-500/10 to-blue-500/5"
                } rounded-lg px-3 py-2 border ${colors.weatherBorder}`}
              >
                <div
                  className={`text-xs font-semibold uppercase tracking-wider ${colors.weatherWind}`}
                >
                  {wind} km/h
                </div>
              </div>
            </div>
          </div>

          {/* Forecast */}
          <div className={`mt-3 pt-3 border-t ${colors.forecastBorder}`}>
            <p
              className={`text-xs md:text-sm font-semibold uppercase tracking-widest mb-3 ${colors.text}`}
            >
              Pronóstico
            </p>
            <div
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:overflow-visible"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${forecast.length}, 1fr)`,
                gap: "0.5rem",
              }}
            >
              {forecast.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 min-w-14 flex flex-col items-center text-center ${colors.forecastCardBg} rounded-xl py-3 px-2 md:px-3 border ${colors.forecastCardBorder} hover:shadow-xl hover:scale-105 transition-all duration-200 backdrop-blur-sm bg-gradient-to-b from-white/5 to-transparent`}
                  >
                    <p
                      className={`text-xs md:text-sm font-bold ${colors.forecastDay} mb-1`}
                    >
                      {f.day}
                    </p>
                    <div
                      className={`p-1.5 md:p-2 rounded-full bg-gradient-to-br from-white/10 to-transparent my-1.5`}
                    >
                      <Icon
                        className={`w-5 h-5 md:w-6 md:h-6 ${colors.forecastIcon} drop-shadow-sm`}
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <p
                        className={`text-xs md:text-sm font-bold ${colors.forecastTemp}`}
                      >
                        {f.hi}°
                      </p>
                      <p
                        className={`text-[10px] md:text-xs ${colors.mutedText}`}
                      >
                        {f.lo}°
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </SimpleCard>
  );
}
