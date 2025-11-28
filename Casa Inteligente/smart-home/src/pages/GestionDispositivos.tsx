"use client";

import React from "react";
import SimpleCard from "../components/UI/Card";
import PageHeader from "../components/UI/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  CheckCircle,
  XCircle,
  Activity,
  Filter,
  Lightbulb,
  Wind,
  DoorOpen,
  Power,
  Computer,
} from "lucide-react";
import { useGestionDispositivos } from "../hooks/useGestionDispositivos";
import { useThemeByTime } from "../hooks/useThemeByTime";

interface Device {
  id: number;
  name: string;
  power: string;
  on: boolean;
  device_type: string;
  state_json: { status: string };
  last_updated: string;
}

export default function GestionDispositivos() {
  const {
    devices,
    energyUsage,
    deviceTypes,
    deviceTypeFilter,
    setDeviceTypeFilter,
    statusFilter,
    setStatusFilter,
    toggleDevice,
  } = useGestionDispositivos();
  const { colors } = useThemeByTime();

  const [activeTab, setActiveTab] = React.useState<"control" | "energia">(
    "control"
  );

  const getDeviceIcon = (device: Device) => {
    switch (device.device_type) {
      case "luz":
        return <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6" />;
      case "puerta":
        return <DoorOpen className="w-5 h-5 sm:w-6 sm:h-6" />;
      case "ventilador":
        return <Wind className="w-5 h-5 sm:w-6 sm:h-6" />;
      default:
        return <Activity className="w-5 h-5 sm:w-6 sm:h-6" />;
    }
  };

  return (
    <div
      className={`min-h-screen p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter w-full ${colors.background} ${colors.text}`}
    >
      <PageHeader
        title="Gestión de dispositivos"
        icon={<Computer className={`w-8 md:w-10 h-8 md:h-10 ${colors.icon}`} />}
      />

      <div
        className={`flex flex-col sm:flex-row gap-0 sm:gap-1 w-full border-b ${colors.border}`}
        role="tablist"
      >
        <button
          onClick={() => setActiveTab("control")}
          role="tab"
          aria-selected={activeTab === "control"}
          className={`min-h-[52px] sm:min-h-[48px] px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 font-medium transition-colors duration-300 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base md:text-lg relative ${
            activeTab === "control"
              ? colors.text
              : `${colors.mutedText} ${colors.buttonHover}`
          }`}
        >
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="text-center sm:text-left leading-tight font-semibold">
            Control de dispositivos
          </span>
          {activeTab === "control" && (
            <motion.span
              layoutId="underline"
              className={`absolute bottom-[-1px] left-0 right-0 h-[3px] bg-gradient-to-r ${colors.secondary} rounded-full`}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("energia")}
          role="tab"
          aria-selected={activeTab === "energia"}
          className={`min-h-[52px] sm:min-h-[48px] px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 font-medium transition-colors duration-300 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base md:text-lg relative ${
            activeTab === "energia"
              ? colors.text
              : `${colors.mutedText} ${colors.buttonHover}`
          }`}
        ></button>
      </div>

      <div className="space-y-5 sm:space-y-6 md:space-y-7 mt-4 sm:mt-5 md:mt-6">
        <AnimatePresence mode="wait">
          {activeTab === "control" && (
            <motion.div
              key="control-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              role="tabpanel"
            >
              <div className="mb-5 sm:mb-6 flex flex-col xl:flex-row md:grid md:grid-cols-[1fr_1fr] gap-2 sm:gap-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {["Todos", ...deviceTypes].map((type) => (
                    <motion.button
                      key={type}
                      onClick={() =>
                        setDeviceTypeFilter(type === "Todos" ? "Todos" : type)
                      }
                      className={`min-h-[48px] px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm border ${
                        deviceTypeFilter === type
                          ? colors.buttonActive
                          : `${colors.buttonInactive} ${colors.buttonHover}`
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {type === "Todos" ? (
                        <Filter className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        getDeviceIcon({ device_type: type } as Device)
                      )}
                      <span>
                        {type === "Todos"
                          ? "Todos"
                          : type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-2">
                  {[
                    { name: "Encendidos", icon: CheckCircle, color: "green" },
                    { name: "Apagados", icon: XCircle, color: "red" },
                  ].map((f) => (
                    <motion.button
                      key={f.name}
                      onClick={() => {
                        if (statusFilter === f.name) {
                          setStatusFilter("Todos");
                        } else {
                          setStatusFilter(f.name);
                        }
                      }}
                      className={`flex-1 min-h-[48px] px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm border ${
                        statusFilter === f.name
                          ? f.color === "green"
                            ? colors.successChip
                            : colors.dangerChip
                          : `${colors.buttonInactive} ${colors.buttonHover}`
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {React.createElement(f.icon, {
                        className: "w-4 h-4 flex-shrink-0",
                      })}
                      <span>{f.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-6 sm:mb-7 md:mb-8">
                {[
                  {
                    title: "Total",
                    icon: Activity,
                    value: devices.length,
                    gradient: colors.purpleGradient,
                    text: colors.purpleText,
                    iconColor: colors.purpleIcon,
                  },
                  {
                    title: "Activos",
                    icon: CheckCircle,
                    value: devices.filter((d) => d.on).length,
                    gradient: colors.greenGradient,
                    text: colors.greenText,
                    iconColor: colors.greenIcon,
                  },
                  {
                    title: "Inactivos",
                    icon: XCircle,
                    value: devices.filter((d) => !d.on).length,
                    gradient: colors.orangeGradient,
                    text: colors.orangeText,
                    iconColor: colors.redIcon,
                  },
                  {
                    title: "Consumo",
                    icon: Zap,
                    value: `${energyUsage}W`,
                    gradient: colors.cyanGradient,
                    text: colors.cyanText,
                    iconColor: colors.yellowIcon,
                  },
                ].map((stat) => (
                  <SimpleCard
                    key={stat.title}
                    className={`p-4 sm:p-5 md:p-6 text-center bg-gradient-to-br ${stat.gradient} border ${colors.cardHover}`}
                  >
                    <div className="flex justify-center items-center mb-2 sm:mb-3">
                      <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center ${colors.chipBg} shadow-lg`}
                      >
                        {React.createElement(stat.icon, {
                          className: `w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${stat.iconColor}`,
                        })}
                      </div>
                    </div>
                    <p
                      className={`text-xs sm:text-sm md:text-base font-semibold mb-1 uppercase tracking-wider ${stat.text}`}
                    >
                      {stat.title}
                    </p>
                    <p
                      className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold ${colors.text} font-inter`}
                    >
                      {stat.value}
                    </p>
                  </SimpleCard>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                <AnimatePresence>
                  {devices.map((device, i) => (
                    <motion.div
                      key={device.id}
                      initial={{ opacity: 0, y: 50, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                    >
                      <SimpleCard
                        className={`h-full p-4 sm:p-5 md:p-6 flex items-center gap-3 sm:gap-4 md:gap-5 transition-all duration-300 border ${
                          colors.cardBg
                        } ${colors.cardHover} ${
                          device.on ? colors.energyBorder : colors.tempBorder
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <div
                            className={`w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full flex items-center justify-center transition-all duration-300 ${
                              device.on ? colors.deviceOn : colors.deviceOff
                            }`}
                          >
                            {getDeviceIcon(device)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm sm:text-base md:text-lg lg:text-xl font-bold ${colors.text} font-inter whitespace-normal`}
                            >
                              {device.name}
                            </span>
                          </div>
                          <div
                            className={`text-xs sm:text-sm ${colors.mutedText}`}
                          >
                            {device.power}
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          <button
                            onClick={() => toggleDevice(device.id)}
                            className={`w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 border-2 ${
                              device.on
                                ? `bg-red-500 hover:bg-red-600 border-red-400/50 text-white`
                                : `bg-green-500 hover:bg-green-600 border-green-400/50 text-white`
                            }`}
                          >
                            <Power className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9" />
                          </button>
                        </div>
                      </SimpleCard>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
