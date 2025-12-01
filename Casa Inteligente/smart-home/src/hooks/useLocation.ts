"use client";

import { useState, useEffect, useCallback } from "react";
import { axiosInstance } from "../services/authService";

interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);

  // Cargar ubicación guardada
  useEffect(() => {
    const saved = localStorage.getItem("userLocation");
    if (saved) {
      try {
        setLocation(JSON.parse(saved));
      } catch (e) {
        console.error("Error al cargar ubicación:", e);
      }
    }
  }, []);

  // Actualizar ubicación y guardarla en el servidor
  const handleLocationChange = useCallback(
    async (latitude: number, longitude: number, locationName: string) => {
      const newLocation: LocationData = {
        latitude,
        longitude,
        name: locationName,
      };

      setLocation(newLocation);
      localStorage.setItem("userLocation", JSON.stringify(newLocation));

      // Guardar en el servidor (backend)
      try {
        await axiosInstance.put("/weather/coordinates", {
          latitude,
          longitude,
        });
        console.log("Ubicación actualizada en el servidor");
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.detail ||
          error?.message ||
          "Error desconocido";
        console.error(
          "Error al actualizar ubicación en el servidor:",
          errorMessage
        );
      }
    },
    []
  );

  return {
    location,
    handleLocationChange,
  };
}
