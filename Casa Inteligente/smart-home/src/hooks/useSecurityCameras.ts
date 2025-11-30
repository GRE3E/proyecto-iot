"use client"

import { useState } from "react"

export function useSecurityCameras() {
  const [systemOn, setSystemOn] = useState(false)
  const [cameraStates, setCameraStates] = useState<Record<string, boolean>>({
    camera1: false,
    camera2: false,
  })

  const toggleCamera = (cameraId: string) => {
    if (!systemOn) return
    setCameraStates(prev => ({
      ...prev,
      [cameraId]: !prev[cameraId]
    }))
  }

  const toggleSystem = (state: boolean) => {
    setSystemOn(state)
    if (!state) {
      // Si apagas el sistema, desactiva todas las cámaras
      setCameraStates({
        camera1: false,
        camera2: false,
      })
    }
  }

  const activeCameras = Object.values(cameraStates).filter(Boolean).length

  const isCameraActive = (cameraId: string): boolean => {
    return cameraStates[cameraId] && systemOn
  }

  return {
    systemOn,
    setSystemOn: toggleSystem,
    cameraStates,
    toggleCamera,
    activeCameras,
    isCameraActive,
  }
}