"use client";

import { Home, Zap, Thermometer, Droplets, Power } from "lucide-react";
import PageHeader from "../components/UI/PageHeader";
import AnimatedClockWidget from "../components/widgets/AnimatedClockWidget";
import SimpleButton from "../components/UI/Button";
import { useState, useMemo } from "react";
import { useThemeByTime } from "../hooks/useThemeByTime";

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
    {
      name: "Aire Acondicionado",
      location: "Dormitorio",
      power: "1500W",
      on: false,
    },
    { name: "Bombilla Cocina", location: "Cocina", power: "40W", on: true },
  ],
}: {
  temperature?: number;
  humidity?: number;
  energyUsage?: number;
  devices?: Device[];
} = {}) {
  const [expandedCard, setExpandedCard] = useState<
    "energy" | "temp" | "humidity" | "devices" | null
  >("energy");
  const [deviceFilter, setDeviceFilter] = useState<
    "all" | "luz" | "puerta" | "ventilador"
  >("all");
  const { colors } = useThemeByTime();

  const energyHistory = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const baseValue = 300 + Math.sin(i * 0.3) * 100;
      const variation = Math.random() * 80 - 40;
      return Math.max(100, baseValue + variation);
    });
  }, []);

  const temperatureHistory = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const baseValue = 22 + Math.sin(i * 0.4) * 3;
      const variation = Math.random() * 2 - 1;
      return Math.round((baseValue + variation) * 10) / 10;
    });
  }, []);

  const humidityHistory = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const baseValue = 45 + Math.cos(i * 0.3) * 15;
      const variation = Math.random() * 10 - 5;
      return Math.max(20, Math.min(80, baseValue + variation));
    });
  }, []);

  const activeDevices = devices.filter((d) => d.on).length;

  const avgEnergy = Math.round(
    energyHistory.reduce((a, b) => a + b) / energyHistory.length
  );
  const avgTemp =
    Math.round(
      (temperatureHistory.reduce((a, b) => a + b) / temperatureHistory.length) *
        10
    ) / 10;
  const avgHumidity = Math.round(
    humidityHistory.reduce((a, b) => a + b) / humidityHistory.length
  );
  const maxEnergy = Math.max(...energyHistory);
  const minEnergy = Math.min(...energyHistory);
  const maxTemp = Math.max(...temperatureHistory);
  const minTemp = Math.min(...temperatureHistory);

  const getDevicesByFilter = () => {
    const deviceMap: { [key: string]: string[] } = {
      luz: ["Luz", "Bombilla", "Lámpara"],
      puerta: ["Puerta", "Cerradura"],
      ventilador: ["Aire", "Ventilador", "Climatización"],
    };
    if (deviceFilter === "all") return devices;
    return devices.filter((d) =>
      deviceMap[deviceFilter]?.some((keyword) =>
        d.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  };

  const filteredDevices = getDevicesByFilter();

  const getSectionTheme = (
    type: "energy" | "temp" | "humidity" | "devices"
  ) => {
    const themeMap = {
      energy: {
        card: colors.energyCard,
        border: colors.energyBorder,
        shadow: colors.energyShadow,
        text: colors.greenText,
        icon: colors.greenIcon,
      },
      temp: {
        card: colors.tempCard,
        border: colors.tempBorder,
        shadow: colors.tempShadow,
        text: colors.orangeText,
        icon: colors.orangeIcon,
      },
      humidity: {
        card: colors.humidityCard,
        border: colors.humidityBorder,
        shadow: colors.humidityShadow,
        text: colors.cyanText,
        icon: colors.cyanIcon,
      },
      devices: {
        card: colors.devicesCard,
        border: colors.devicesBorder,
        shadow: colors.devicesShadow,
        text: colors.violetText,
        icon: colors.violetIcon,
      },
    };
    return themeMap[type];
  };

  const NavButton = ({
    type,
    label,
    icon: Icon,
    value,
    unit,
  }: {
    type: "energy" | "temp" | "humidity" | "devices";
    label: string;
    icon: any;
    value: string | number;
    unit?: string;
  }) => {
    const sectionTheme = getSectionTheme(type);
    const isActive = expandedCard === type;

    return (
      <button
        onClick={() => setExpandedCard(type)}
        className={`flex-1 p-4 rounded-lg transition-all text-left backdrop-blur-sm ${
          isActive
            ? `bg-gradient-to-br ${sectionTheme.card} ring-2 ${sectionTheme.border} shadow-lg ${sectionTheme.shadow} ${colors.cardBorder}`
            : `${colors.cardBg} hover:shadow-md`
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon
            className={`w-5 h-5 ${isActive ? sectionTheme.icon : colors.icon}`}
          />
          <div>
            <h4
              className={`font-semibold text-sm ${
                isActive ? sectionTheme.text : colors.text
              }`}
            >
              {label}
            </h4>
            <p
              className={`text-xs mt-0.5 ${
                isActive ? sectionTheme.text : colors.mutedText
              }`}
            >
              {value}
              {unit}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const renderChart = (
    type: "energy" | "temp" | "humidity",
    data: number[]
  ) => {
    const chartColorMap = {
      energy: "#10b981",
      temp: "#f97316",
      humidity: "#06b6d4",
      devices: "#8b5cf6",
    };
    const chartColor = chartColorMap[type];
    const gradientId = `${type}Gradient`;

    if (type === "energy") {
      return (
        <svg viewBox="0 0 1000 300" className="w-full h-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1="50"
              y1={50 + i * 50}
              x2="950"
              y2={50 + i * 50}
              stroke={chartColor}
              strokeWidth="1"
              opacity="0.1"
            />
          ))}
          {data.map((value, i) => {
            const x = 50 + (i / (data.length - 1)) * 900;
            const y = 250 - (value / 500) * 200;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="2.5" fill={chartColor} opacity="0.8" />
                {i > 0 && (
                  <line
                    x1={50 + ((i - 1) / (data.length - 1)) * 900}
                    y1={250 - (data[i - 1] / 500) * 200}
                    x2={x}
                    y2={y}
                    stroke={chartColor}
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
          <path
            d={`M 50,${250 - (data[0] / 500) * 200} ${data
              .map(
                (v, i) =>
                  `L ${50 + (i / (data.length - 1)) * 900} ${
                    250 - (v / 500) * 200
                  }`
              )
              .join(" ")} L 950,250 L 50,250 Z`}
            fill={`url(#${gradientId})`}
          />
        </svg>
      );
    }

    if (type === "temp") {
      return (
        <svg viewBox="0 0 1000 300" className="w-full h-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1="50"
              y1={50 + i * 50}
              x2="950"
              y2={50 + i * 50}
              stroke={chartColor}
              strokeWidth="1"
              opacity="0.1"
            />
          ))}
          {data.map((v, i) => {
            const x = 50 + (i / (data.length - 1)) * 900;
            const y = 250 - (v / 35) * 200;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="2.5" fill={chartColor} opacity="0.8" />
                {i > 0 && (
                  <line
                    x1={50 + ((i - 1) / (data.length - 1)) * 900}
                    y1={250 - (data[i - 1] / 35) * 200}
                    x2={x}
                    y2={y}
                    stroke={chartColor}
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
          <path
            d={`M50,${250 - (data[0] / 35) * 200} ${data
              .map(
                (v, i) =>
                  `L ${50 + (i / (data.length - 1)) * 900} ${
                    250 - (v / 35) * 200
                  }`
              )
              .join(" ")} L950,250 L50,250 Z`}
            fill={`url(#${gradientId})`}
          />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 1000 300" className="w-full h-full">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1="50"
            y1={50 + i * 50}
            x2="950"
            y2={50 + i * 50}
            stroke={chartColor}
            strokeWidth="1"
            opacity="0.1"
          />
        ))}
        {data.map((v, i) => {
          const x = 50 + (i / (data.length - 1)) * 900;
          const height = (v / 100) * 200;
          const y = 250 - height;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={10}
                height={height}
                fill={`url(#${gradientId})`}
                rx="4"
              />
              <rect
                x={x}
                y={y}
                width={10}
                height={height}
                fill="none"
                stroke={chartColor}
                strokeWidth="1"
                opacity="0.5"
                rx="4"
              />
            </g>
          );
        })}
      </svg>
    );
  };

  const renderSection = (type: "energy" | "temp" | "humidity" | "devices") => {
    const sectionTheme = getSectionTheme(type);

    if (type === "energy") {
      return (
        <div
          className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg backdrop-blur-sm ${colors.cardBg} border border-transparent hover:border-${sectionTheme.border} transition-all`}
        >
          <div className="flex items-center mb-3">
            <Zap className={`w-5 h-5 ${sectionTheme.icon}`} />
            <div className="ml-2">
              <h3 className={`text-md font-bold ${sectionTheme.text}`}>
                Energía
              </h3>
              <p className={`text-[10px] mt-0.5 ${colors.mutedText}`}>
                Últimas 24 horas
              </p>
            </div>
          </div>
          <div
            className={`h-36 md:h-40 flex items-center justify-center mb-3 rounded-lg bg-gradient-to-br ${sectionTheme.card} p-2 border ${sectionTheme.border}`}
          >
            {renderChart("energy", energyHistory)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Actual", value: energyUsage },
              { label: "Promedio", value: avgEnergy },
              { label: "Máximo", value: Math.round(maxEnergy) },
              { label: "Mí­nimo", value: Math.round(minEnergy) },
            ].map((item) => (
              <div
                key={item.label}
                className={`p-2 md:p-3 rounded-lg ${colors.cardBg} border ${sectionTheme.border}`}
              >
                <p className={`text-[10px] ${colors.mutedText}`}>
                  {item.label}
                </p>
                <div className="flex items-center gap-1 md:gap-2">
                  <p
                    className={`text-xl md:text-2xl font-bold ${sectionTheme.text}`}
                  >
                    {item.value}
                  </p>
                  <span className={`text-[9px] md:text-xs ${colors.mutedText}`}>
                    kWh
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (type === "temp") {
      return (
        <div
          className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg backdrop-blur-sm ${colors.cardBg} border border-transparent hover:border-${sectionTheme.border} transition-all`}
        >
          <div className="flex items-center mb-3">
            <Thermometer className={`w-5 h-5 ${sectionTheme.icon}`} />
            <div className="ml-2">
              <h3 className={`text-md font-bold ${sectionTheme.text}`}>
                Temperatura
              </h3>
              <p className={`text-[10px] mt-0.5 ${colors.mutedText}`}>
                Últimas 24 horas
              </p>
            </div>
          </div>
          <div
            className={`h-36 md:h-40 flex items-center justify-center mb-3 rounded-lg bg-gradient-to-br ${sectionTheme.card} p-2 border ${sectionTheme.border}`}
          >
            {renderChart("temp", temperatureHistory)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Actual", value: temperature, unit: "Â°C" },
              { label: "Promedio", value: avgTemp, unit: "Â°C" },
              { label: "MÃ¡ximo", value: maxTemp, unit: "Â°C" },
              { label: "MÃ­nimo", value: minTemp, unit: "Â°C" },
            ].map((item) => (
              <div
                key={item.label}
                className={`p-2 md:p-3 rounded-lg ${colors.cardBg} border ${sectionTheme.border}`}
              >
                <p className={`text-[10px] ${colors.mutedText}`}>
                  {item.label}
                </p>
                <div className="flex items-center gap-1 md:gap-2">
                  <p
                    className={`text-xl md:text-2xl font-bold ${sectionTheme.text}`}
                  >
                    {item.value}
                  </p>
                  <span className={`text-[9px] md:text-xs ${colors.mutedText}`}>
                    {item.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (type === "humidity") {
      return (
        <div
          className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg backdrop-blur-sm ${colors.cardBg} border border-transparent hover:border-${sectionTheme.border} transition-all`}
        >
          <div className="flex items-center mb-3">
            <Droplets className={`w-5 h-5 ${sectionTheme.icon}`} />
            <div className="ml-2">
              <h3 className={`text-md font-bold ${sectionTheme.text}`}>
                Humedad
              </h3>
              <p className={`text-[10px] mt-0.5 ${colors.mutedText}`}>
                Últimas 24 horas
              </p>
            </div>
          </div>
          <div
            className={`h-36 md:h-40 flex items-center justify-center mb-3 rounded-lg bg-gradient-to-br ${sectionTheme.card} p-2 border ${sectionTheme.border}`}
          >
            {renderChart("humidity", humidityHistory)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Actual", value: humidity, unit: "%" },
              { label: "Promedio", value: avgHumidity, unit: "%" },
              { label: "MÃ¡ximo", value: 80, unit: "%" },
              { label: "MÃ­nimo", value: 20, unit: "%" },
            ].map((item) => (
              <div
                key={item.label}
                className={`p-2 md:p-3 rounded-lg ${colors.cardBg} border ${sectionTheme.border}`}
              >
                <p className={`text-[10px] ${colors.mutedText}`}>
                  {item.label}
                </p>
                <div className="flex items-center gap-1 md:gap-2">
                  <p
                    className={`text-xl md:text-2xl font-bold ${sectionTheme.text}`}
                  >
                    {item.value}
                  </p>
                  <span className={`text-[9px] md:text-xs ${colors.mutedText}`}>
                    {item.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg backdrop-blur-sm ${colors.cardBg} border border-transparent hover:border-${sectionTheme.border} transition-all`}
      >
        <div className="flex items-center mb-3">
          <Power className={`w-5 h-5 ${sectionTheme.icon}`} />
          <div className="ml-2">
            <h3 className={`text-md font-bold ${sectionTheme.text}`}>
              Dispositivos
            </h3>
            <p className={`text-[10px] mt-0.5 ${colors.mutedText}`}>
              {activeDevices} de {devices.length} activos
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap">
          {(["all", "luz", "puerta", "ventilador"] as const).map((filter) => (
            <SimpleButton
              key={filter}
              onClick={() => setDeviceFilter(filter)}
              active={deviceFilter === filter}
              className="px-3 py-1 text-sm"
            >
              {filter === "all"
                ? "Todos"
                : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </SimpleButton>
          ))}
        </div>

        <div className="space-y-2 mb-2">
          {filteredDevices.length > 0 ? (
            filteredDevices.map((d, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg ${colors.cardBg} border ${sectionTheme.border} hover:border-${sectionTheme.border} transition-all`}
              >
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${sectionTheme.text}`}>
                    {d.name}
                  </p>
                  {d.location && (
                    <p className={`text-xs mt-1 ${colors.mutedText}`}>
                      {d.location}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-xs ${colors.mutedText}`}>Consumo</p>
                  <p className={`text-sm font-semibold ${sectionTheme.text}`}>
                    {d.power}
                  </p>
                </div>
                <div
                  className={`w-3 h-3 ml-4 rounded-full shadow-lg transition-all ${
                    d.on ? "bg-green-400 shadow-green-400/60" : "bg-slate-400"
                  }`}
                />
              </div>
            ))
          ) : (
            <p className={`text-sm ${colors.mutedText}`}>
              No hay dispositivos en esta categorí­a.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`p-4 md:p-6 pt-8 md:pt-4 space-y-6 font-inter ${colors.background} ${colors.text}`}
    >
      <PageHeader
        title="Bienvenido"
        icon={<Home className="w-8 md:w-10 h-8 md:w-10 text-white" />}
      />
      <AnimatedClockWidget temperature={temperature} />

      <div>
        <h2
          className={`text-sm md:text-base font-bold mb-4 tracking-widest uppercase ${colors.mutedText}`}
        >
          Resumen del Sistema
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:hidden gap-2 sm:gap-3 mb-5">
          <NavButton
            type="energy"
            label="Energí­a"
            icon={Zap}
            value={energyUsage}
            unit=" kWh"
          />
          <NavButton
            type="temp"
            label="Temperatura"
            icon={Thermometer}
            value={temperature}
            unit="°C"
          />
          <NavButton
            type="humidity"
            label="Humedad"
            icon={Droplets}
            value={humidity}
            unit="%"
          />
          <NavButton
            type="devices"
            label="Dispositivos"
            icon={Power}
            value={`${activeDevices} activos`}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          <div className="w-full lg:flex-1">
            {expandedCard === "energy" && renderSection("energy")}
            {expandedCard === "temp" && renderSection("temp")}
            {expandedCard === "humidity" && renderSection("humidity")}
            {expandedCard === "devices" && renderSection("devices")}
          </div>

          <div className="hidden lg:block w-full lg:w-80 flex-shrink-0 space-y-4">
            {(["energy", "temp", "humidity", "devices"] as const).map(
              (type) => {
                const sectionTheme = getSectionTheme(type);
                const isActive = expandedCard === type;
                const config = {
                  energy: {
                    label: "EnergÃ­a",
                    icon: Zap,
                    value: `${energyUsage} kWh usados`,
                  },
                  temp: {
                    label: "Temperatura",
                    icon: Thermometer,
                    value: `${temperature}Â°C actuales`,
                  },
                  humidity: {
                    label: "Humedad",
                    icon: Droplets,
                    value: `${humidity}% actual`,
                  },
                  devices: {
                    label: "Dispositivos",
                    icon: Power,
                    value: `${activeDevices} activos`,
                  },
                };
                const { label, icon: Icon, value } = config[type];

                return (
                  <button
                    key={type}
                    onClick={() => setExpandedCard(type)}
                    className={`w-full p-4 rounded-lg cursor-pointer transition-all text-left backdrop-blur-sm ${
                      isActive
                        ? `bg-gradient-to-br ${sectionTheme.card} ring-2 ${sectionTheme.border} shadow-lg ${sectionTheme.shadow}`
                        : `${colors.cardBg} hover:shadow-md border border-transparent`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 ${
                          isActive ? sectionTheme.icon : colors.icon
                        }`}
                      />
                      <h4
                        className={`font-semibold text-sm ${
                          isActive ? sectionTheme.text : colors.text
                        }`}
                      >
                        {label}
                      </h4>
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        isActive ? sectionTheme.text : colors.mutedText
                      }`}
                    >
                      {value}
                    </p>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
