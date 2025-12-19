"use client";

import { Droplets } from "lucide-react";
import { useMemo } from "react";
import { useThemeByTime } from "../../hooks/useThemeByTime";

interface HumidityStatisticsProps {
  humidity: number;
}

export default function HumidityStatistics({
  humidity,
}: HumidityStatisticsProps) {
  const { colors } = useThemeByTime();

  const humidityHistory = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const baseValue = 45 + Math.cos(i * 0.3) * 15;
      const variation = Math.random() * 10 - 5;
      return Math.max(20, Math.min(80, baseValue + variation));
    });
  }, []);

  const avgHumidity = Math.round(
    humidityHistory.reduce((a, b) => a + b) / humidityHistory.length
  );

  const getSectionTheme = (type: "humidity") => {
    const themeMap = {
      humidity: {
        card: colors.humidityCard,
        border: colors.humidityBorder,
        shadow: colors.humidityShadow,
        text: colors.cyanText,
        icon: colors.cyanIcon,
      },
    };
    return themeMap[type];
  };

  const renderChart = (type: "humidity", data: number[]) => {
    const chartColorMap = {
      humidity: "#06b6d4",
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

  const sectionTheme = getSectionTheme("humidity");

  return (
    <div
      className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg backdrop-blur-sm ${colors.cardBg} border border-transparent hover:border-${sectionTheme.border} transition-all`}
    >
      <div className="flex items-center mb-3">
        <Droplets className={`w-5 h-5 ${sectionTheme.icon}`} />
        <div className="ml-2">
          <h3 className={`text-md font-bold ${sectionTheme.text}`}>Humedad</h3>
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
          { label: "Máximo", value: 80, unit: "%" },
          { label: "Mí­nimo", value: 20, unit: "%" },
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
