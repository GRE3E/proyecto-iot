"use client";

import { useState, useEffect, useCallback } from "react";
import { axiosInstance } from "../services/authService";

interface TimeData {
  current_time: string; // ISO 8601 format
  timezone_name: string;
  timezone_offset_seconds: number;
  location_name: string;
  utc_time: string;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
  name: string;
}

export function useTimeData() {
  const [timeData, setTimeData] = useState<TimeData | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTime = useCallback(async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      setError(null);

      console.log(
        `[useTimeData] Fetching time for lat=${latitude}, lon=${longitude}`
      );

      const response = await axiosInstance.get("/weather/time", {
        params: { latitude, longitude },
      });

      console.log("[useTimeData] API Response:", response.data);

      if (response.data) {
        setTimeData({
          current_time: response.data.current_time,
          timezone_name: response.data.timezone_name,
          timezone_offset_seconds: response.data.timezone_offset_seconds,
          location_name: response.data.location_name,
          utc_time: response.data.utc_time,
        });

        // Sincronizar hora local con la hora del servidor
        setCurrentTime(new Date(response.data.current_time));
        console.log("[useTimeData] Time synchronized successfully");
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.detail || err?.message || "Error al obtener hora";
      console.error("[useTimeData] Error fetching time:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar reloj local cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime((prevTime) => {
        const newTime = new Date(prevTime.getTime() + 1000);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Cargar hora inicial y sincronizar con servidor periódicamente
  useEffect(() => {
    const loadTime = () => {
      console.log("[useTimeData] Loading time...");
      const saved = localStorage.getItem("userLocation");
      console.log("[useTimeData] localStorage.userLocation:", saved);

      if (saved) {
        try {
          const location: LocationCoords = JSON.parse(saved);
          console.log("[useTimeData] Parsed location:", location);
          fetchTime(location.latitude, location.longitude);
        } catch (e) {
          console.error(
            "[useTimeData] Error parsing location from localStorage:",
            e
          );
          setError("No se pudo cargar la ubicación guardada");
        }
      } else {
        // Fallback a Lima, Perú si no hay ubicación guardada
        console.log("[useTimeData] No location saved, using Lima default");
        fetchTime(-12.0464, -77.0428);
      }
    };

    loadTime(); // Carga inicial

    // Sincronizar con servidor cada 5 minutos para corregir drift
    const interval = setInterval(loadTime, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchTime]);

  return {
    timeData,
    currentTime,
    loading,
    error,
    refetch: fetchTime,
  };
}
