"use client";

import { Power } from "lucide-react";
import { useState, useEffect } from "react";
import { useGestionDispositivos } from "../../hooks/useGestionDispositivos";
import { useThemeByTime } from "../../hooks/useThemeByTime";

export default function DevicesStatistics() {
  const { colors } = useThemeByTime();
  const { devices } = useGestionDispositivos();
  const activeDeviceCount = devices.filter((d) => d.on).length;

  const [deviceCountHistory, setDeviceCountHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeviceCountHistory = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          throw new Error("No authentication token found.");
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/iot/device_count_history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: number[] = await response.json();
        setDeviceCountHistory(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceCountHistory();
  }, []);

  const getSectionTheme = (type: "devices") => {
    const themeMap = {
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

  const renderChart = (
    type: "devices",
    data: number[],
    loading: boolean,
    error: string | null
  ) => {
    const chartColorMap = {
      devices: "#8b5cf6", // Color violeta para dispositivos
    };
    const chartColor = chartColorMap[type];
    const gradientId = `${type}Gradient`;

    if (loading) {
      return (
        <svg viewBox="0 0 1000 300" className="w-full h-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.2" />
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
          <text
            x="500"
            y="160"
            textAnchor="middle"
            fill={chartColor}
            opacity="0.5"
            fontSize="24"
            fontWeight="500"
          >
            Cargando...
          </text>
        </svg>
      );
    }

    if (error) {
      return (
        <svg viewBox="0 0 1000 300" className="w-full h-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1="50"
              y1={50 + i * 50}
              x2="950"
              y2={50 + i * 50}
              stroke="#ef4444"
              strokeWidth="1"
              opacity="0.1"
            />
          ))}
          <text
            x="500"
            y="160"
            textAnchor="middle"
            fill="#ef4444"
            opacity="0.6"
            fontSize="20"
            fontWeight="500"
          >
            Error al cargar datos
          </text>
        </svg>
      );
    }

    if (data.length === 0) {
      return (
        <svg viewBox="0 0 1000 300" className="w-full h-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.2" />
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
          <text
            x="500"
            y="160"
            textAnchor="middle"
            fill={chartColor}
            opacity="0.5"
            fontSize="24"
            fontWeight="500"
          >
            Sin datos disponibles
          </text>
        </svg>
      );
    }

    // Escala para el eje Y (ajustar según el número máximo esperado de dispositivos)
    const maxDeviceCount = Math.max(...data, 1); // Asegura que no sea 0
    const yScale = 200 / (maxDeviceCount + 2); // Ajusta la escala para que el gráfico no se salga

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
          const y = 250 - value * yScale; // Usar yScale para ajustar la altura
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="2.5" fill={chartColor} opacity="0.8" />
              {i > 0 && (
                <line
                  x1={50 + ((i - 1) / (data.length - 1)) * 900}
                  y1={250 - data[i - 1] * yScale}
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
          d={`M 50,${250 - data[0] * yScale} ${data
            .map(
              (v, i) =>
                `L ${50 + (i / (data.length - 1)) * 900} ${250 - v * yScale}`
            )
            .join(" ")} L 950,250 L 50,250 Z`}
          fill={`url(#${gradientId})`}
        />
      </svg>
    );
  };

  const sectionTheme = getSectionTheme("devices");

  return (
    <div
      className={`p-4 pt-4 pb-1 md:p-5 md:pb-2 rounded-lg backdrop-blur-sm ${colors.cardBg} border border-transparent hover:border-${sectionTheme.border} transition-all`}
    >
      <div className="flex items-center mb-3">
        <Power className={`w-5 h-5 ${sectionTheme.icon}`} />
        <div className="ml-2">
          <h3 className={`text-md font-bold ${sectionTheme.text}`}>
            Historial de Conexiones de Dispositivos
          </h3>
          <p className={`text-[10px] mt-0.5 ${colors.mutedText}`}>
            Últimas 24 horas
          </p>
        </div>
      </div>
      <div
        className={`h-36 md:h-40 flex items-center justify-center mb-3 rounded-lg bg-gradient-to-br ${sectionTheme.card} p-2 border ${sectionTheme.border}`}
      >
        {renderChart("devices", deviceCountHistory, loading, error)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {!loading && !error && deviceCountHistory.length > 0 && (
          <>
            {[
              {
                label: "Activos Ahora",
                value: activeDeviceCount,
              },
              {
                label: "Promedio",
                value:
                  Math.round(
                    deviceCountHistory.reduce((a, b) => a + b) /
                      deviceCountHistory.length
                  ) || 0,
              },
              { label: "Máximo", value: Math.max(...deviceCountHistory) || 0 },
              { label: "Mínimo", value: Math.min(...deviceCountHistory) || 0 },
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
                    dispositivos
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
