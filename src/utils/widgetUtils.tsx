// logica widget
// utils/widgetUtils.ts

import { Cloud, Snowflake, Sun, CloudRain } from "lucide-react"
import React from "react"

// -------- Clima Futurista --------
export function getWeatherData(temperature: number, condition?: string) {
  // Map weather conditions to labels and icons
  const conditionMap: { [key: string]: { label: string; icon: React.JSX.Element; advice: string } } = {
    'Sunny': { label: 'Soleado', icon: <Sun className="w-10 h-10 text-yellow-400 animate-spin-slow" />, advice: 'Disfruta del sol ☀️' },
    'Clear': { label: 'Despejado', icon: <Sun className="w-10 h-10 text-yellow-400 animate-spin-slow" />, advice: 'Cielo despejado 🌞' },
    'Partly cloudy': { label: 'Parcialmente nublado', icon: <Cloud className="w-10 h-10 text-slate-200 animate-float" />, advice: 'Algunas nubes ☁️' },
    'Cloudy': { label: 'Nublado', icon: <Cloud className="w-10 h-10 text-slate-200 animate-float" />, advice: 'Cielo nublado ☁️' },
    'Overcast': { label: 'Cubierto', icon: <Cloud className="w-10 h-10 text-slate-200 animate-float" />, advice: 'Cielo cubierto ☁️' },
    'Light rain': { label: 'Lluvia ligera', icon: <CloudRain className="w-10 h-10 text-blue-300 animate-bounce" />, advice: 'Lluvia ligera 🌧️' },
    'Moderate rain': { label: 'Lluvia moderada', icon: <CloudRain className="w-10 h-10 text-blue-300 animate-bounce" />, advice: 'Lluvia moderada 🌧️' },
    'Heavy rain': { label: 'Lluvia intensa', icon: <CloudRain className="w-10 h-10 text-blue-300 animate-bounce" />, advice: 'Lluvia intensa 🌧️' },
    'Snow': { label: 'Nieve', icon: <Snowflake className="w-10 h-10 text-cyan-300 animate-bounce" />, advice: 'Nevando ❄️' },
    'Light snow': { label: 'Nieve ligera', icon: <Snowflake className="w-10 h-10 text-cyan-300 animate-bounce" />, advice: 'Nieve ligera ❄️' },
    'Fog': { label: 'Niebla', icon: <Cloud className="w-10 h-10 text-gray-400 animate-pulse" />, advice: 'Niebla densa 🌫️' },
    'Mist': { label: 'Bruma', icon: <Cloud className="w-10 h-10 text-gray-400 animate-pulse" />, advice: 'Bruma ligera 🌫️' },
  }

  // If condition is provided and matches, use it
  if (condition && conditionMap[condition]) {
    return conditionMap[condition]
  }

  // Fallback to temperature-based logic
  if (temperature < 12) {
    return {
      icon: <Snowflake className="w-10 h-10 text-cyan-300 animate-bounce" />,
      silhouette: <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center text-slate-600 text-xs">☃️</div>, // Silueta simple de persona con nieve
      label: "Frío",
      advice: "Abrígate, hace frío ❄️",
    }
  } else if (temperature < 25) {
    return {
      icon: <Cloud className="w-10 h-10 text-slate-200 animate-float" />,
      silhouette: <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center text-slate-600 text-xs">🚶</div>, // Silueta de persona caminando
      label: "Agradable",
      advice: "Clima agradable 🌤",
    }
  } else {
    return {
      icon: <Sun className="w-10 h-10 text-yellow-400 animate-spin-slow" />,
      silhouette: <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center text-slate-600 text-xs">🧘</div>, // Silueta de persona sentada
      label: "Cálido",
      advice: "Calor intenso 🔥",
    }
  }
}

// -------- Partículas HUD --------
export function generateParticles(count = 12) {
  // fewer, smaller and slower particles to reduce visual clutter
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    speedX: (Math.random() - 0.5) * 0.05,
    speedY: (Math.random() - 0.5) * 0.05,
  }))
}

export function updateParticles(particles: any[]) {
  return particles.map((p) => ({
    ...p,
    x: (p.x + p.speedX + 100) % 100,
    y: (p.y + p.speedY + 100) % 100,
  }))
}
