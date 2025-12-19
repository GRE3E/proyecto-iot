"use client";

import { useState, useEffect, useCallback } from "react";
import { axiosInstance } from "../services/authService";

interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  wind_speed: number;
  feels_like: number;
  pressure: number;
  visibility: number;
  location_name?: string;
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_sum: number[];
  };
}

interface LocationCoords {
  latitude: number;
  longitude: number;
  name: string;
}

export function useWeatherData() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        setLoading(true);
        setError(null);

        const response = await axiosInstance.get("/weather", {
          params: { latitude, longitude },
        });

        if (response.data && response.data.current) {
          // La respuesta tiene la estructura: { current: {temp, relative_humidity_2m, ...}, hourly: {...}, daily: {...} }
          const current = response.data.current;
          const weatherData = {
            temperature: current.temp || current.temperature_2m,
            description: current.weather_description || "Desconocido",
            humidity: current.relative_humidity_2m,
            wind_speed: current.wind_speed_10m,
            feels_like: current.apparent_temperature,
            pressure: current.pressure,
            visibility: current.visibility,
            location_name: response.data.timezone,
            daily: response.data.daily, // Incluir datos diarios para pronóstico
          };

          setWeather(weatherData);
        }
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.detail ||
          err?.message ||
          "Error al obtener clima";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Cargar clima inicial y configurar actualización automática
  useEffect(() => {
    const loadWeather = () => {
      const saved = localStorage.getItem("userLocation");

      if (saved) {
        try {
          const location: LocationCoords = JSON.parse(saved);
          fetchWeather(location.latitude, location.longitude);
        } catch (e) {
          setError("No se pudo cargar la ubicación guardada");
        }
      } else {
        // Fallback a Lima, Perú si no hay ubicación guardada
        fetchWeather(-12.0464, -77.0428);
      }
    };

    loadWeather(); // Carga inicial

    // Actualizar cada 10 minutos
    const interval = setInterval(loadWeather, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchWeather]);

  return {
    weather,
    loading,
    error,
    refetch: fetchWeather,
  };
}
