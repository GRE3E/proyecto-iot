// useGestionDispositivos.ts
"use client";

import { useState, useEffect, useRef } from "react";
import { axiosInstance } from "../services/authService";
import { useWebSocket } from "./useWebSocket";
import { v4 as uuidv4 } from "uuid";

export interface Device {
  id: number;
  name: string;
  power: string;
  on: boolean;
  device_type: string;
  state_json: { status: string };
  last_updated: string;
}

export function useGestionDispositivos(initialDevices?: Device[]) {
  const clientId = useRef(uuidv4());
  const { message } = useWebSocket(clientId.current);
  // const { accessToken } = useAuth(); // Ya no es necesario obtenerlo aquí directamente
  const [devices, setDevices] = useState<Device[]>([]);
  const [energyUsage, setEnergyUsage] = useState<number>(150); // mismo nombre que usas en UI
  const [filter, setFilter] = useState<string>("Todos");

  useEffect(() => {
    if (message && message.device_name && message.state) {
      setDevices((prevDevices) =>
        prevDevices.map((device) =>
          device.name.replace(/ /g, "_") === message.device_name
            ? {
                ...device,
                on:
                  message.state.status === "ON" ||
                  message.state.status === "OPEN",
                state_json: message.state,
                last_updated: new Date().toISOString(),
              }
            : device
        )
      );
    }
  }, [message]);

  const fetchDevicesByType = async (deviceType: string): Promise<Device[]> => {
    try {
      const response = await axiosInstance.get(
        `/iot/device_states/by_type/${deviceType}`
      );
      const data = response.data;
      return data.map((item: any) => ({
        id: item.id,
        name: item.device_name.replace(/_/g, " "),
        power: "60W",
        on: item.state_json.status === "ON",
        device_type: item.device_type,
        state_json: item.state_json,
        last_updated: item.last_updated,
      }));
    } catch (error) {
      console.error(`Error fetching devices of type ${deviceType}:`, error);
      return [];
    }
  };

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const response = await axiosInstance.get(`/iot/device_types`);
        const data = response.data;
        const deviceTypes = data.device_types;

        const allDevices: Device[] = [];

        for (const type of deviceTypes) {
          const fetched = await fetchDevicesByType(type);
          allDevices.push(...fetched);
        }
        setDevices(allDevices);
      } catch (error) {
        console.error("Error loading device types or devices:", error);
      }
    };

    loadDevices();
  }, []);

  // Calcula costos (misma lógica del original)
  const costPerKWH = 0.15;
  const estimatedDailyCost = (energyUsage / 1000) * 24 * costPerKWH;
  const estimatedMonthlyCost = estimatedDailyCost * 30;
  const estimatedAnnualCost = estimatedMonthlyCost * 12;

  // toggle por index (mantiene la API que usabas: toggleDevice(devices.indexOf(device)))
  const toggleDevice = async (id: number) => {
    setDevices((prevDevices) =>
      prevDevices.map((device) =>
        device.id === id ? { ...device, on: !device.on } : device
      )
    );

    const deviceToToggle = devices.find((device) => device.id === id);
    if (!deviceToToggle) return;

    const newStatus =
      deviceToToggle.device_type === "puerta"
        ? deviceToToggle.on
          ? "CLOSE"
          : "OPEN"
        : deviceToToggle.on
        ? "OFF"
        : "ON";

    try {
      await axiosInstance.put(`/iot/device_states/${id}`, {
        new_state: { status: newStatus },
      });

      // Si la petición fue exitosa, el estado ya se actualizó localmente
      console.log(`Device ${id} toggled to ${newStatus}`);
    } catch (error) {
      console.error("Error toggling device:", error);
      // Revertir el estado local si la petición falla
      setDevices((prevDevices) =>
        prevDevices.map((device) =>
          device.id === id ? { ...device, on: !device.on } : device
        )
      );
    }
  };

  // Si quieres simular variación de consumo, descomenta este useEffect:
  useEffect(() => {
    const t = setInterval(() => {
      setEnergyUsage((v) =>
        Math.max(100, Math.min(500, Math.round(v + (Math.random() * 10 - 5))))
      );
    }, 3000);
    return () => clearInterval(t);
  }, []);

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
  };
}
