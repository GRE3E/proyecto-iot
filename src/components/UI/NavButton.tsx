"use client";

import { useThemeByTime } from "../../hooks/useThemeByTime";

interface NavButtonProps {
  type: "energy" | "temp" | "humidity" | "devices";
  label: string;
  icon: any;
  value: string | number;
  unit?: string;
  expandedCard: "energy" | "temp" | "humidity" | "devices" | null;
  setExpandedCard: (
    type: "energy" | "temp" | "humidity" | "devices" | null
  ) => void;
}

export default function NavButton({
  type,
  label,
  icon: Icon,
  value,
  unit,
  expandedCard,
  setExpandedCard,
}: NavButtonProps) {
  const isActive = expandedCard === type;
  const { colors } = useThemeByTime();

  const getCardColors = (
    cardType: "energy" | "temp" | "humidity" | "devices"
  ) => {
    switch (cardType) {
      case "energy":
        return {
          card: colors.energyCard,
          border: colors.energyBorder,
          shadow: colors.energyShadow,
          text: colors.greenText,
          icon: colors.greenIcon,
        };
      case "temp":
        return {
          card: colors.tempCard,
          border: colors.tempBorder,
          shadow: colors.tempShadow,
          text: colors.orangeText,
          icon: colors.orangeIcon,
        };
      case "humidity":
        return {
          card: colors.humidityCard,
          border: colors.humidityBorder,
          shadow: colors.humidityShadow,
          text: colors.cyanText,
          icon: colors.cyanIcon,
        };
      case "devices":
        return {
          card: colors.devicesCard,
          border: colors.devicesBorder,
          shadow: colors.devicesShadow,
          text: colors.violetText,
          icon: colors.violetIcon,
        };
      default:
        return { card: "", border: "", shadow: "", text: "", icon: "" };
    }
  };

  const sectionTheme = getCardColors(type);

  return (
    <button
      onClick={() => setExpandedCard(type)}
      className={`block w-full p-4 rounded-lg transition-all text-left backdrop-blur-sm ${
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
}
