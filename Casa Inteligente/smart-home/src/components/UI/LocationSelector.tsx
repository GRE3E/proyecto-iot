// ============================================
// components/UI/LocationSelector.tsx
// ============================================
"use client";

import { useState, useEffect } from "react";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import SimpleCard from "./Card";
import { useThemeByTime } from "../../hooks/useThemeByTime";
 

interface LocationSelectorProps {
  onLocationChange: (
    latitude: number,
    longitude: number,
    locationName: string
  ) => void;
}

export default function LocationSelector({
  onLocationChange,
}: LocationSelectorProps) {
  const { colors } = useThemeByTime();
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  } | null>(null);

  // Cargar ubicación guardada
  useEffect(() => {
    const saved = localStorage.getItem("userLocation");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentLocation(parsed);
      } catch (e) {
        console.error("Error al cargar ubicación guardada:", e);
      }
    }
  }, []);

  // Detectar ubicación con GPS
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización");
      return;
    }

    setIsDetecting(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Intentar obtener nombre de la ubicación usando reverse geocoding
        let locationName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        try {
          // Usar Nominatim de OpenStreetMap (gratis, sin API key)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            {
              headers: {
                "User-Agent": "SmartHomeApp/1.0", // Requerido por Nominatim
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.county;
            const country = data.address?.country;
            if (city && country) {
              locationName = `${city}, ${country}`;
            } else if (city) {
              locationName = city;
            }
          }
        } catch (e) {
          console.log(
            "No se pudo obtener el nombre de la ubicación, usando coordenadas"
          );
        }

        const location = { latitude, longitude, name: locationName };
        setCurrentLocation(location);
        localStorage.setItem("userLocation", JSON.stringify(location));
        onLocationChange(latitude, longitude, locationName);
        setIsDetecting(false);
      },
      (error) => {
        setIsDetecting(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError("Permiso denegado. Activa la ubicación en tu navegador.");
            break;
          case error.POSITION_UNAVAILABLE:
            setError("Ubicación no disponible. Intenta de nuevo.");
            break;
          case error.TIMEOUT:
            setError("Tiempo de espera agotado. Intenta de nuevo.");
            break;
          default:
            setError("Error al obtener ubicación.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Seleccionar ciudad manualmente
  

  return (
    <SimpleCard className="p-4">
      <div className="space-y-4">
        {/* Título y ubicación actual */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div
              className={`${colors.text} flex items-center gap-2 font-medium text-sm`}
            >
              <MapPin className={`w-4 h-4 ${colors.icon}`} />
              Ubicación
            </div>
            <div className={`text-xs ${colors.mutedText} truncate mt-1`}>
              {currentLocation ? currentLocation.name : "No detectada"}
            </div>
            {currentLocation && (
              <div className={`text-xs ${colors.mutedText} mt-0.5`}>
                {currentLocation.latitude.toFixed(4)},{" "}
                {currentLocation.longitude.toFixed(4)}
              </div>
            )}
          </div>
        </div>

        {/* Botón de detección GPS */}
        <button
          onClick={detectLocation}
          disabled={isDetecting}
          className={`w-full ${colors.inputBg} ${colors.text} rounded-lg px-4 py-2.5 text-sm border ${colors.inputBorder} hover:border-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isDetecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Detectando ubicación...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              Usar mi ubicación actual
            </>
          )}
        </button>

        {/* Mensaje de error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}

        
      </div>
    </SimpleCard>
  );
}
