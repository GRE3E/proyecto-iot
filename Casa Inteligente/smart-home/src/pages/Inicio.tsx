"use client";

import { Home, Zap, Thermometer, Droplets } from "lucide-react";
import PageHeader from "../components/UI/PageHeader";
import AnimatedClockWidget from "../components/widgets/AnimatedClockWidget";
import { useState } from "react";
import NavButton from "../components/UI/NavButton";
import { useThemeByTime } from "../hooks/useThemeByTime";
import { useEnergyData } from "../hooks/useEnergyData";
import EnergyStatistics from "../components/statistics/EnergyStatistics";
import TemperatureStatistics from "../components/statistics/TemperatureStatistics";
import HumidityStatistics from "../components/statistics/HumidityStatistics";
import DevicesStatistics from "../components/statistics/DevicesStatistics";

interface Device {
  name: string;
  location?: string;
  power: string;
  on: boolean;
}

export default function Inicio({
  temperature = 24,
  humidity = 45,
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
  devices?: Device[];
} = {}) {
  const [expandedCard, setExpandedCard] = useState<
    "energy" | "temp" | "humidity" | "devices" | null
  >("energy");
  const { colors } = useThemeByTime();
  const { energyHistory, loading: energyLoading } = useEnergyData();

  const currentEnergy =
    energyHistory.length > 0 ? energyHistory[energyHistory.length - 1] : 0;
  const energyValue = energyLoading ? "Cargando..." : currentEnergy.toFixed(2);

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
            label="Energía"
            icon={Zap}
            value={energyValue}
            unit=" kWh"
            expandedCard={expandedCard}
            setExpandedCard={setExpandedCard}
          />
          <NavButton
            type="temp"
            label="Temperatura"
            icon={Thermometer}
            value={temperature}
            unit="°C"
            expandedCard={expandedCard}
            setExpandedCard={setExpandedCard}
          />
          <NavButton
            type="humidity"
            label="Humedad"
            icon={Droplets}
            value={humidity}
            unit="%"
            expandedCard={expandedCard}
            setExpandedCard={setExpandedCard}
          />
          <NavButton
            type="devices"
            label="Dispositivos"
            icon={Zap}
            value={`${devices.filter((d) => d.on).length} activos`}
            expandedCard={expandedCard}
            setExpandedCard={setExpandedCard}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          <div className="w-full lg:flex-1">
            {expandedCard === "energy" && <EnergyStatistics />}
            {expandedCard === "temp" && (
              <TemperatureStatistics temperature={temperature} />
            )}
            {expandedCard === "humidity" && (
              <HumidityStatistics humidity={humidity} />
            )}
            {expandedCard === "devices" && (
              <DevicesStatistics devices={devices} />
            )}
          </div>

          <div className="hidden lg:block w-full lg:w-80 flex-shrink-0 space-y-4">
            {(["energy", "temp", "humidity", "devices"] as const).map(
              (type) => {
                const config = {
                  energy: {
                    label: "Energía",
                    icon: Zap,
                    value: energyValue,
                  },
                  temp: {
                    label: "Temperatura",
                    icon: Thermometer,
                    value: `${temperature}°C actuales`,
                  },
                  humidity: {
                    label: "Humedad",
                    icon: Droplets,
                    value: `${humidity}% actual`,
                  },
                  devices: {
                    label: "Dispositivos",
                    icon: Zap,
                    value: `${devices.filter((d) => d.on).length} activos`,
                  },
                };
                const { label, icon: Icon, value } = config[type];
                return (
                  <NavButton
                    key={type}
                    type={type}
                    label={label}
                    icon={Icon}
                    value={value}
                    expandedCard={expandedCard}
                    setExpandedCard={setExpandedCard}
                  />
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
