"use client"

import { useState, useEffect } from "react"
import { devicesPage1, devicesPage2, devicesPage3 } from "../utils/monitoreoUtils"

type Tab = "monitoreo" | "seguridad"

export function useMonitoreoSeguridad() {
  // Tabs
  const [activeTab, setActiveTab] = useState<Tab>("seguridad")

  // Variables ambientales
  const [temperature, setTemperature] = useState(22)
  const [humidity, setHumidity] = useState(55)
  const [energyUsage, setEnergyUsage] = useState(250)

  // Seguridad
  const [deviceStates, setDeviceStates] = useState<boolean[]>([])
  const [cameraOn, setCameraOn] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [allDevicesOn, setAllDevicesOn] = useState(false)
  const [isSystemCardVisible, setIsSystemCardVisible] = useState(true)

  // Inicializa todos los dispositivos apagados
  useEffect(() => {
    const totalDevices = [...devicesPage1, ...devicesPage2, ...devicesPage3].length
    setDeviceStates(new Array(totalDevices).fill(false))
  }, [])

  // Cambiar estado de un dispositivo
  const toggleDevice = (index: number) => {
    setDeviceStates((prev) =>
      prev.map((state, i) => (i === index ? !state : state))
    )
  }

  // Activar o desactivar todos
  const toggleAllDevices = () => {
    const newState = !allDevicesOn
    setDeviceStates(new Array(deviceStates.length).fill(newState))
    setAllDevicesOn(newState)
  }

  // Cambiar página del sistema
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= 3) setCurrentPage(page)
  }

  return {
    // Tabs
    activeTab,
    setActiveTab,

    // Monitoreo ambiental
    temperature,
    setTemperature,
    humidity,
    setHumidity,
    energyUsage,
    setEnergyUsage,

    // Seguridad
    deviceStates,
    toggleDevice,
    toggleAllDevices,
    cameraOn,
    setCameraOn,
    currentPage,
    handlePageChange,
    allDevicesOn,
    isSystemCardVisible,
    setIsSystemCardVisible,
  }
}
