//Funciones de dispositivos inteligentes
// src/utils/deviceUtils.tsx
import { Lightbulb, Plug, Thermometer } from "lucide-react"
import type { ReactNode } from "react"
export type DeviceType = "light" | "ac" | "plug" | "unknown"

export interface Device {
  name: string
  location?: string
  power: string
  on: boolean
}

/**
 * Devuelve el ícono adecuado según el nombre del dispositivo.
 */
export function getDeviceIcon(deviceName: string): ReactNode {
  if (deviceName.includes("Luz") || deviceName.includes("Bombillo")) {
    return <Lightbulb className="w-5 h-5 text-white" />
  }
  if (deviceName.includes("Aire")) {
    return <Thermometer className="w-5 h-5 text-white" />
  }
  return <Plug className="w-5 h-5 text-white" />
}

// Devuelve un tipo simple para decidir el icono en la UI
export function getDeviceType(name: string): DeviceType {
  if (!name) return "unknown"
  const low = name.toLowerCase()
  if (low.includes("luz") || low.includes("bombillo") || low.includes("light")) return "light"
  if (low.includes("aire") || low.includes("ac") || low.includes("a/c")) return "ac"
  if (low.includes("enchufe") || low.includes("plug") || low.includes("toma")) return "plug"
  return "unknown"
}