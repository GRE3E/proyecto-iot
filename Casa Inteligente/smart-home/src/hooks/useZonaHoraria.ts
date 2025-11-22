"use client";

import { useState, useEffect, useCallback } from "react";
import { axiosInstance } from "../services/authService";

export interface TimezoneConfig {
  region: string;
  timezone: string;
  offset: string;
  daylightSaving: boolean;
  utcOffset: number;
}

export const TIMEZONE_DATA: Record<string, TimezoneConfig[]> = {
  "América": [
    {
      region: "Argentina",
      timezone: "America/Argentina/Buenos_Aires",
      offset: "UTC-3",
      daylightSaving: false,
      utcOffset: -3,
    },
    {
      region: "Bolivia",
      timezone: "America/La_Paz",
      offset: "UTC-4",
      daylightSaving: false,
      utcOffset: -4,
    },
    {
      region: "Brasil",
      timezone: "America/Sao_Paulo",
      offset: "UTC-3",
      daylightSaving: true,
      utcOffset: -3,
    },
    {
      region: "Chile",
      timezone: "America/Santiago",
      offset: "UTC-3",
      daylightSaving: true,
      utcOffset: -3,
    },
    {
      region: "Colombia",
      timezone: "America/Bogota",
      offset: "UTC-5",
      daylightSaving: false,
      utcOffset: -5,
    },
    {
      region: "Costa Rica",
      timezone: "America/Costa_Rica",
      offset: "UTC-6",
      daylightSaving: false,
      utcOffset: -6,
    },
    {
      region: "Ecuador",
      timezone: "America/Guayaquil",
      offset: "UTC-5",
      daylightSaving: false,
      utcOffset: -5,
    },
    {
      region: "El Salvador",
      timezone: "America/El_Salvador",
      offset: "UTC-6",
      daylightSaving: false,
      utcOffset: -6,
    },
    {
      region: "Guatemala",
      timezone: "America/Guatemala",
      offset: "UTC-6",
      daylightSaving: false,
      utcOffset: -6,
    },
    {
      region: "Honduras",
      timezone: "America/Tegucigalpa",
      offset: "UTC-6",
      daylightSaving: false,
      utcOffset: -6,
    },
    {
      region: "México",
      timezone: "America/Mexico_City",
      offset: "UTC-6",
      daylightSaving: true,
      utcOffset: -6,
    },
    {
      region: "Nicaragua",
      timezone: "America/Managua",
      offset: "UTC-6",
      daylightSaving: false,
      utcOffset: -6,
    },
    {
      region: "Panamá",
      timezone: "America/Panama",
      offset: "UTC-5",
      daylightSaving: false,
      utcOffset: -5,
    },
    {
      region: "Paraguay",
      timezone: "America/Asuncion",
      offset: "UTC-4",
      daylightSaving: true,
      utcOffset: -4,
    },
    {
      region: "Perú",
      timezone: "America/Lima",
      offset: "UTC-5",
      daylightSaving: false,
      utcOffset: -5,
    },
    {
      region: "Uruguay",
      timezone: "America/Montevideo",
      offset: "UTC-3",
      daylightSaving: true,
      utcOffset: -3,
    },
    {
      region: "Venezuela",
      timezone: "America/Caracas",
      offset: "UTC-4",
      daylightSaving: false,
      utcOffset: -4,
    },
    {
      region: "Alaska",
      timezone: "America/Anchorage",
      offset: "UTC-9",
      daylightSaving: true,
      utcOffset: -9,
    },
  ],
  Europa: [
    {
      region: "España",
      timezone: "Europe/Madrid",
      offset: "UTC+1",
      daylightSaving: true,
      utcOffset: 1,
    },
    {
      region: "Francia",
      timezone: "Europe/Paris",
      offset: "UTC+1",
      daylightSaving: true,
      utcOffset: 1,
    },
    {
      region: "Alemania",
      timezone: "Europe/Berlin",
      offset: "UTC+1",
      daylightSaving: true,
      utcOffset: 1,
    },
    {
      region: "Italia",
      timezone: "Europe/Rome",
      offset: "UTC+1",
      daylightSaving: true,
      utcOffset: 1,
    },
    {
      region: "Reino Unido",
      timezone: "Europe/London",
      offset: "UTC+0",
      daylightSaving: true,
      utcOffset: 0,
    },
    {
      region: "Portugal",
      timezone: "Europe/Lisbon",
      offset: "UTC+0",
      daylightSaving: true,
      utcOffset: 0,
    },
    {
      region: "Suiza",
      timezone: "Europe/Zurich",
      offset: "UTC+1",
      daylightSaving: true,
      utcOffset: 1,
    },
    {
      region: "Países Bajos",
      timezone: "Europe/Amsterdam",
      offset: "UTC+1",
      daylightSaving: true,
      utcOffset: 1,
    },
    {
      region: "Chequia",
      timezone: "Europe/Prague",
      offset: "UTC+1",
      daylightSaving: true,
      utcOffset: 1,
    },
  ],
  Asia: [
    {
      region: "China",
      timezone: "Asia/Shanghai",
      offset: "UTC+8",
      daylightSaving: false,
      utcOffset: 8,
    },
    {
      region: "Japón",
      timezone: "Asia/Tokyo",
      offset: "UTC+9",
      daylightSaving: false,
      utcOffset: 9,
    },
    {
      region: "India",
      timezone: "Asia/Kolkata",
      offset: "UTC+5:30",
      daylightSaving: false,
      utcOffset: 5.5,
    },
    {
      region: "Tailandia",
      timezone: "Asia/Bangkok",
      offset: "UTC+7",
      daylightSaving: false,
      utcOffset: 7,
    },
    {
      region: "Vietnam",
      timezone: "Asia/Ho_Chi_Minh",
      offset: "UTC+7",
      daylightSaving: false,
      utcOffset: 7,
    },
    {
      region: "Filipinas",
      timezone: "Asia/Manila",
      offset: "UTC+8",
      daylightSaving: false,
      utcOffset: 8,
    },
    {
      region: "Emiratos Árabes Unidos",
      timezone: "Asia/Dubai",
      offset: "UTC+4",
      daylightSaving: false,
      utcOffset: 4,
    },
  ],
  Oceanía: [
    {
      region: "Australia (Sidney)",
      timezone: "Australia/Sydney",
      offset: "UTC+11",
      daylightSaving: true,
      utcOffset: 11,
    },
    {
      region: "Australia (Melbourne)",
      timezone: "Australia/Melbourne",
      offset: "UTC+11",
      daylightSaving: true,
      utcOffset: 11,
    },
    {
      region: "Nueva Zelanda",
      timezone: "Pacific/Auckland",
      offset: "UTC+13",
      daylightSaving: true,
      utcOffset: 13,
    },
  ],
  África: [
    {
      region: "Egipto",
      timezone: "Africa/Cairo",
      offset: "UTC+2",
      daylightSaving: true,
      utcOffset: 2,
    },
  ],
};

export function useZonaHoraria() {
  const [selectedTimezone, setSelectedTimezone] = useState<TimezoneConfig | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  // Cargar zona horaria guardada
  useEffect(() => {
    const saved = localStorage.getItem("userTimezone");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSelectedTimezone(parsed);
    } else {
      // Usar Perú por defecto
      const defaultTimezone = TIMEZONE_DATA["América"].find(
        (tz) => tz.region === "Perú"
      );
      if (defaultTimezone) {
        setSelectedTimezone(defaultTimezone);
        localStorage.setItem("userTimezone", JSON.stringify(defaultTimezone));
      }
    }
  }, []);

  // Actualizar hora y fecha en tiempo real
  useEffect(() => {
    const updateTime = () => {
      if (!selectedTimezone) return;

      const now = new Date();
      const formatter = new Intl.DateTimeFormat("es-ES", {
        timeZone: selectedTimezone.timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const dateFormatter = new Intl.DateTimeFormat("es-ES", {
        timeZone: selectedTimezone.timezone,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      setCurrentTime(formatter.format(now));
      setCurrentDate(dateFormatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [selectedTimezone]);

  // Maneja el cambio de zona horaria y lo guarda en el servidor
  const handleTimezoneChange = useCallback(async (timezoneString: string) => {
    const timezoneConfig = getTimezoneByTimezone(timezoneString);
    if (!timezoneConfig) {
      console.error("Zona horaria inválida:", timezoneString);
      return;
    }

    setSelectedTimezone(timezoneConfig);
    localStorage.setItem("userTimezone", JSON.stringify(timezoneConfig));

    try {
      const response = await axiosInstance.put('/nlp/config/timezone', {
        timezone: timezoneConfig.timezone,
      });
      if (response.status >= 200 && response.status < 300) {
        console.log("Zona horaria actualizada exitosamente en el servidor.");
      } else {
        const errorMessage = (response.data && (response.data.detail || JSON.stringify(response.data))) || `status ${response.status}`;
        console.error('Error al actualizar la zona horaria en el servidor:', errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Error desconocido';
      console.error('Error al actualizar la zona horaria en el servidor:', errorMessage);
    }
  }, []);

  // Obtener todas las zonas horarias en un array
  const getAllTimezones = useCallback(() => {
    const allTimezones: TimezoneConfig[] = [];
    Object.values(TIMEZONE_DATA).forEach((continentTimezones) => {
      allTimezones.push(...continentTimezones);
    });
    return allTimezones;
  }, []);

  // Obtener zona horaria por timezone string
  const getTimezoneByTimezone = useCallback(
    (timezoneString: string): TimezoneConfig | null => {
      for (const continent of Object.values(TIMEZONE_DATA)) {
        const found = continent.find((tz) => tz.timezone === timezoneString);
        if (found) return found;
      }
      try {
        const parts = timezoneString.split('/');
        const regionName = parts[1] ? parts[1].replace('_', ' ') : parts[0];
        return {
          region: regionName,
          timezone: timezoneString,
          offset: "",
          daylightSaving: false,
          utcOffset: 0,
        };
      } catch {
        return null;
      }
    },
    []
  );

  return {
    selectedTimezone,
    setSelectedTimezone,
    currentTime,
    currentDate,
    handleTimezoneChange,
    getAllTimezones,
    getTimezoneByTimezone,
    TIMEZONE_DATA,
  };
}