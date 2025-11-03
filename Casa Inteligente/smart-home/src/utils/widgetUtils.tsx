// logica widget
// utils/widgetUtils.ts

import { Cloud, Snowflake, Sun } from "lucide-react"

// -------- Clima Futurista --------
export function getWeatherData(temperature: number) {
  if (temperature < 12) {
    return {
      icon: <Snowflake className="w-10 h-10 text-cyan-300 animate-bounce" />,
      label: "Frío",
      advice: "Abrígate, hace frío ❄️",
    }
  } else if (temperature < 25) {
    return {
      icon: <Cloud className="w-10 h-10 text-slate-200 animate-float" />,
      label: "Agradable",
      advice: "Clima agradable 🌤",
    }
  } else {
    return {
      icon: <Sun className="w-10 h-10 text-yellow-400 animate-spin-slow" />,
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
