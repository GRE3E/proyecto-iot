import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import { axiosInstance } from "../services/authService";

export const useTemperatureData = () => {
  const { accessToken } = useAuth();
  const [temperatureHistory, setTemperatureHistory] = useState<number[]>([]);
  const [currentTemperature, setCurrentTemperature] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);

  const requestTemperature = useCallback(async () => {
    if (!accessToken) return;

    try {
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      const response = await axiosInstance.post(
        `${baseUrl}/iot/temperature/request`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data?.success && response.data?.temperature != null) {
        setCurrentTemperature(response.data.temperature);
        console.log(
          "[TemperatureData] Temperatura obtenida via MQTT:",
          response.data.temperature
        );
      }
    } catch (error) {
      console.warn(
        "[TemperatureData] No se pudo solicitar temperatura via MQTT:",
        error
      );
    }
  }, [accessToken]);

  const fetchTemperatureHistory = useCallback(async () => {
    if (!accessToken) return;

    try {
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      const response = await axiosInstance.get(
        `${baseUrl}/iot/temperature/history`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data: number[] = response.data;
      setTemperatureHistory(data);

      // Actualizar temperatura actual con el último valor del historial si no tenemos una reciente
      if (data.length > 0 && currentTemperature === null) {
        setCurrentTemperature(data[data.length - 1]);
      }
    } catch (error) {
      console.error("Error fetching temperature data:", error);
      setTemperatureHistory([]);
    }
  }, [accessToken, currentTemperature]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Primero solicitar temperatura via MQTT (esto guarda en DB)
      await requestTemperature();

      // Luego obtener el historial
      await fetchTemperatureHistory();

      setLoading(false);
    };

    if (accessToken) {
      fetchData();
    }
  }, [accessToken, requestTemperature, fetchTemperatureHistory]);

  return {
    temperatureHistory,
    currentTemperature,
    loading,
    requestTemperature,
  };
};
