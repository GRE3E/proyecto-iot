"use client";

import { Power } from "lucide-react";
import { useState, useMemo } from "react";
import { useThemeByTime } from "../../hooks/useThemeByTime";
import SimpleButton from "../UI/Button";

interface Device {
  name: string;
  location?: string;
  power: string;
  on: boolean;
}

interface DevicesStatisticsProps {
  devices: Device[];
}

export default function DevicesStatistics({ devices }: DevicesStatisticsProps) {
  const [deviceFilter, setDeviceFilter] = useState<
    "all" | "luz" | "puerta" | "ventilador"
  >("all");
  const { colors } = useThemeByTime();

  const activeDevices = devices.filter((d) => d.on).length;

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

  const filteredDevices = useMemo(() => getDevicesByFilter(), [deviceFilter, devices]);

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

  const sectionTheme = getSectionTheme("devices");

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
            No hay dispositivos en esta categoría.
          </p>
        )}
      </div>
    </div>
  );
}
