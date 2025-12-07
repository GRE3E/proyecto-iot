import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { axiosInstance } from "../services/authService";

export const useTemperatureData = () => {
  const { accessToken } = useAuth();
  const [temperatureHistory, setTemperatureHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTemperatureData = async () => {
      setLoading(true);
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
      } catch (error) {
        console.error("Error fetching temperature data:", error);
        setTemperatureHistory([]);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchTemperatureData();
    }
  }, [accessToken]);

  return { temperatureHistory, loading };
};
