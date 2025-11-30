"use client";

import { Thermometer } from "lucide-react";
import { useMemo } from "react";
import { useThemeByTime } from "../../hooks/useThemeByTime";

interface TemperatureStatisticsProps {
  temperature: number;
}

export default function TemperatureStatistics({
  temperature,
}: TemperatureStatisticsProps) {
  const { colors } = useThemeByTime();

  const temperatureHistory = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const baseValue = 22 + Math.sin(i * 0.4) * 3;
      const variation = Math.random() * 2 - 1;
      return Math.round((baseValue + variation) * 10) / 10;
    });
  }, []);

  const avgTemp =
    Math.round(
      (temperatureHistory.reduce((a, b) => a + b) / temperatureHistory.length) *
        10
    ) / 10;
  const maxTemp = Math.max(...temperatureHistory);
  const minTemp = Math.min(...temperatureHistory);

  const getSectionTheme = (type: "temp") => {
    const themeMap = {
      temp: {
        card: colors.tempCard,
        border: colors.tempBorder,
        shadow: colors.tempShadow,
        text: colors.orangeText,
        icon: colors.orangeIcon,
      },
    };
    return themeMap[type];
  };

  const renderChart = (type: "temp", data: number[]) => {
    const chartColorMap = {
      temp: "#f97316",
    };
    const chartColor = chartColorMap[type];
    const gradientId = `${type}Gradient`;

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
  };

  const sectionTheme = getSectionTheme("temp");

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
          { label: "Máximo", value: maxTemp, unit: "Â°C" },
          { label: "Mí­nimo", value: minTemp, unit: "Â°C" },
        ].map((item) => (
          <div
            key={item.label}
            className={`p-2 md:p-3 rounded-lg ${colors.cardBg} border ${sectionTheme.border}`}
          >
            <p className={`text-[10px] ${colors.mutedText}`}>{item.label}</p>
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
