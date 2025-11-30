// useGestionDispositivos.ts
"use client";

import { useState, useEffect } from "react";
import { axiosInstance } from "../services/authService";
import { useWebSocket } from "./useWebSocket";

export interface Device {
  id: number;
  name: string;
  power: string;
  on: boolean;
  device_type: string;
  state_json: { status: string };
  last_updated: string;
}

export function useGestionDispositivos() {
  const { message } = useWebSocket();
  const [devices, setDevices] = useState<Device[]>([]);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [energyUsage, setEnergyUsage] = useState<number>(0);
  const [energyHistory, setEnergyHistory] = useState<number[]>([]);
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("Todos");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  useEffect(() => {
    if (message && message.id && message.state) {
      setDevices((prevDevices) =>
        prevDevices.map((device) =>
          device.id === message.id
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

  useEffect(() => {
    const loadAllDevices = async () => {
      try {
        const typesResponse = await axiosInstance.get(`/iot/device_types`);
        setDeviceTypes(typesResponse.data.device_types);

        const statesResponse = await axiosInstance.get(`/iot/device_states`);
        const mappedDevices = statesResponse.data.map((item: any) => ({
          id: item.id,
          name: item.device_name.replace(/_/g, " "),
          power: "",
          on: item.state_json.status === "ON",
          device_type: item.device_type,
          state_json: item.state_json,
          last_updated: item.last_updated,
        }));
        setAllDevices(mappedDevices);
        setDevices(mappedDevices); // Inicialmente, mostrar todos los dispositivos
      } catch (error) {
        console.error("Error loading all devices:", error);
      }
    };

    loadAllDevices();
    loadEnergyData();

    const interval = setInterval(() => {
      loadEnergyData();
    }, 5000); // Actualizar cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  const loadEnergyData = async () => {
    try {
      const response = await axiosInstance.get<number[]>(`/iot/energy`);
      setEnergyHistory(response.data);
      if (response.data.length > 0) {
        setEnergyUsage(response.data[response.data.length - 1]);
      }
    } catch (error) {
      console.error("Error loading energy data:", error);
    }
  };

  useEffect(() => {
    let currentFilteredDevices = allDevices;

    if (deviceTypeFilter !== "Todos") {
      currentFilteredDevices = currentFilteredDevices.filter(
        (device) => device.device_type === deviceTypeFilter
      );
    }

    if (statusFilter === "Encendidos") {
      currentFilteredDevices = currentFilteredDevices.filter(
        (device) => device.on
      );
    } else if (statusFilter === "Apagados") {
      currentFilteredDevices = currentFilteredDevices.filter(
        (device) => !device.on
      );
    }

    setDevices(currentFilteredDevices);
  }, [deviceTypeFilter, statusFilter, allDevices]);

  const costPerKWH = 0.15;
  const estimatedDailyCost = (energyUsage / 1000) * 24 * costPerKWH;
  const estimatedMonthlyCost = estimatedDailyCost * 30;
  const estimatedAnnualCost = estimatedMonthlyCost * 12;

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

      console.log(`Device ${id} toggled to ${newStatus}`);
    } catch (error) {
      console.error("Error toggling device:", error);
      setDevices((prevDevices) =>
        prevDevices.map((device) =>
          device.id === id ? { ...device, on: !device.on } : device
        )
      );
    }
  };

  return {
    devices,
    setDevices,
    energyUsage,
    setEnergyUsage,
    deviceTypeFilter,
    setDeviceTypeFilter,
    statusFilter,
    setStatusFilter,
    toggleDevice,
    costPerKWH,
    estimatedDailyCost,
    estimatedMonthlyCost,
    estimatedAnnualCost,
    deviceTypes,
    energyHistory,
  };
}
