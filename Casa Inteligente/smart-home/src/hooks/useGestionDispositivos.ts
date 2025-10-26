// useGestionDispositivos.ts
"use client"

import { useState, useEffect } from "react"

export interface Device {
  name: string
  location: string
  power: string
  on: boolean
}

export function useGestionDispositivos(initialDevices?: Device[]) {
  const defaultDevices: Device[] = initialDevices ?? [
    { name: "Luz Sala", location: "Sala", power: "45W", on: true },
    { name: "Aire Acondicionado", location: "Dormitorio", power: "120W", on: false },
    { name: "Tv Sala", location: "Sala", power: "60W", on: true },
    { name: "Lampara Mesa", location: "Escritorio", power: "12W", on: false },
  ]

  const [devices, setDevices] = useState<Device[]>(defaultDevices)
  const [energyUsage, setEnergyUsage] = useState<number>(150) // mismo nombre que usas en UI
  const [filter, setFilter] = useState<string>("Todos")

  // Calcula costos (misma lógica del original)
  const costPerKWH = 0.15
  const estimatedDailyCost = ((energyUsage / 1000) * 24) * costPerKWH
  const estimatedMonthlyCost = estimatedDailyCost * 30
  const estimatedAnnualCost = estimatedMonthlyCost * 12

  // toggle por index (mantiene la API que usabas: toggleDevice(devices.indexOf(device)))
  const toggleDevice = (index: number) => {
    setDevices((prev) => {
      const updated = [...prev]
      if (index >= 0 && index < updated.length) {
        updated[index] = { ...updated[index], on: !updated[index].on }
      }
      return updated
    })
  }

  // Si quieres simular variación de consumo, descomenta este useEffect:
  useEffect(() => {
  const t = setInterval(() => {
    setEnergyUsage((v) => Math.max(100, Math.min(500, Math.round(v + (Math.random() * 10 - 5)))))
    }, 3000)
    return () => clearInterval(t)
}, [])

  return {
    // estados
    devices,
    setDevices,
    energyUsage,
    setEnergyUsage,
    filter,
    setFilter,
    // funciones y cálculos
    toggleDevice,
    costPerKWH,
    estimatedDailyCost,
    estimatedMonthlyCost,
    estimatedAnnualCost,
  }
}
