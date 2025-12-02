"use client"

import { useState, useEffect, useCallback } from "react"

interface CameraBackendInfo {
  id: string;
  label: string;
  source: string | number;
  active: boolean;
  recognition_enabled: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getAuthToken(): string | null {
  // Asume que el token JWT se guarda en localStorage después del login
  return localStorage.getItem("access_token");
}

export function useSecurityCameras() {
  const [systemOn, setSystemOnState] = useState(false)
  const [camerasList, setCamerasList] = useState<CameraBackendInfo[]>([])
  const [cameraStates, setCameraStates] = useState<Record<string, boolean>>({})

  const fetchCameras = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      console.error("No hay token de autenticación disponible.")
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cameras`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const backendCameras: CameraBackendInfo[] = Object.values(data.cameras)
      setCamerasList(backendCameras)

      const initialCameraStates: Record<string, boolean> = {}
      backendCameras.forEach(cam => {
        initialCameraStates[cam.id] = cam.active
      })
      setCameraStates(initialCameraStates)
    } catch (error) {
      console.error("Error al obtener la lista de cámaras:", error)
    }
  }, [])

  useEffect(() => {
    fetchCameras()
  }, [fetchCameras])

  const toggleCamera = useCallback(async (cameraId: string) => {
    if (!systemOn) return

    const token = getAuthToken()
    if (!token) {
      console.error("No hay token de autenticación disponible.")
      return
    }

    const currentCameraState = cameraStates[cameraId]
    const newCameraState = !currentCameraState
    const endpoint = newCameraState ? "start" : "stop"

    try {
      const response = await fetch(`${API_BASE_URL}/cameras/living/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recognition_enabled: false }), // Puedes ajustar esto si necesitas controlar el reconocimiento
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Si la operación en el backend fue exitosa, actualiza el estado local
      setCameraStates(prev => ({
        ...prev,
        [cameraId]: newCameraState,
      }))
    } catch (error) {
      console.error(`Error al ${endpoint} la cámara ${cameraId}:`, error)
      // Opcional: revertir el estado local si la llamada al backend falla
    }
  }, [systemOn, cameraStates])

  const toggleSystem = useCallback((state: boolean) => {
    setSystemOnState(state)
    if (!state) {
      // Si apagas el sistema, desactiva todas las cámaras en el frontend
      // y también en el backend si es necesario (esto podría ser una llamada API separada)
      const newStates: Record<string, boolean> = {}
      Object.keys(cameraStates).forEach(camId => {
        newStates[camId] = false
        // Aquí podrías añadir llamadas al backend para detener cada cámara si systemOn afecta a todas
      })
      setCameraStates(newStates)
    }
  }, [cameraStates])

  const activeCameras = Object.values(cameraStates).filter(Boolean).length

  const isCameraActive = useCallback((cameraId: string): boolean => {
    return cameraStates[cameraId] && systemOn
  }, [cameraStates, systemOn])

  return {
    systemOn,
    setSystemOn: toggleSystem,
    camerasList, // Exporta la lista de cámaras del backend
    cameraStates,
    toggleCamera,
    activeCameras,
    isCameraActive,
  }
}