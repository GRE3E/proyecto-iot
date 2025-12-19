import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { axiosInstance } from "../services/authService";

export const useEnergyData = () => {
  const { accessToken } = useAuth();
  const [energyHistory, setEnergyHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEnergyData = async () => {
      setLoading(true);
      try {
        const baseUrl =
          import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
        const response = await axiosInstance.get(`${baseUrl}/iot/energy`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data: number[] = response.data;
        setEnergyHistory(data);
      } catch (error) {
        console.error("Error fetching energy data:", error);
        setEnergyHistory([]);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchEnergyData();
    }
  }, [accessToken]);

  return { energyHistory, loading };
};