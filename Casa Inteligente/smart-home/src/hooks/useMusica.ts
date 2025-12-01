import { useState, useCallback, useEffect } from "react";
import { axiosInstance } from "../services/authService";
import { useWebSocket } from "./useWebSocket";

export interface Cancion {
  id: string;
  titulo: string;
  artista: string;
  urlYoutube: string;
  agregadoPor: string;
  duracion: number;
  createdAt?: string;
  thumbnail?: string;
}

export interface EstadoMusica {
  cancionActual: Cancion | null;
  volumen: number;
  estaReproduciendo: boolean;
  tiempoActual: number;
  cola: Cancion[];
  historial: Cancion[];
  indiceActual: number;
  cargando: boolean;
  error: string | null;
  estaPausado: boolean;
  lastAdded: Cancion | null;
}

export const useMusica = () => {
  const { message } = useWebSocket();
  const [estado, setEstado] = useState<EstadoMusica>({
    cancionActual: null,
    volumen: 70,
    estaReproduciendo: false,
    tiempoActual: 0,
    cola: [],
    historial: [],
    indiceActual: 0,
    cargando: true,
    error: null,
    estaPausado: false,
    lastAdded: null,
  });

  useEffect(() => {
    if (message) {
      try {
        const data = message;
        if (data.type === "music_update") {
          const {
            status,
            current_track,
            queue,
            volume,
            history,
            position,
            duration,
          } = data;

          setEstado((prev) => {
            let cancionActual: Cancion | null = prev.cancionActual;
            if (current_track) {
              cancionActual = {
                id: current_track.started_at || current_track.id,
                titulo: current_track.title,
                artista: current_track.uploader,
                urlYoutube: current_track.query,
                agregadoPor:
                  current_track.started_by?.username || "Desconocido",
                duracion: current_track.duration,
                thumbnail: current_track.thumbnail,
                createdAt: current_track.started_at,
              };
            }
            if (cancionActual && duration !== undefined) {
              cancionActual = { ...cancionActual, duracion: duration };
            }

            const nuevaCola: Cancion[] =
              queue !== undefined
                ? (queue || []).map((item: any) => ({
                    id: item.id || item.started_at,
                    titulo: item.title,
                    artista: item.uploader,
                    urlYoutube: item.query || item.url || "",
                    agregadoPor: item.started_by?.username || "Desconocido",
                    duracion: item.duration,
                    thumbnail: item.thumbnail,
                    createdAt: item.started_at,
                  }))
                : prev.cola;

            const nuevoHistorial: Cancion[] =
              history !== undefined
                ? (history || []).map((item: any) => ({
                    id:
                      item.id ||
                      `${item.title}-${item.uploader}-${item.duration}`,
                    titulo: item.title,
                    artista: item.uploader,
                    urlYoutube: item.query || item.url || "",
                    agregadoPor: item.started_by?.username || "Desconocido",
                    duracion: item.duration,
                    thumbnail: item.thumbnail,
                    createdAt: item.started_at,
                  }))
                : prev.historial;

            const estaReproduciendo =
              status === "playing"
                ? true
                : status === "paused"
                ? false
                : status === "stopped"
                ? false
                : prev.estaReproduciendo;
            const estaPausado =
              status === "paused"
                ? true
                : status === "playing"
                ? false
                : status === "stopped"
                ? false
                : prev.estaPausado;

            return {
              ...prev,
              cancionActual: status === "stopped" ? null : cancionActual,
              estaReproduciendo,
              estaPausado,
              volumen: volume !== undefined ? volume : prev.volumen,
              tiempoActual:
                position !== undefined ? position : prev.tiempoActual,
              cola: nuevaCola,
              historial: nuevoHistorial,
              cargando: false,
              lastAdded: null,
            };
          });
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    }
  }, [message]);

  useEffect(() => {
    let timer: any = null;
    if (estado.estaReproduciendo && estado.cancionActual) {
      timer = setInterval(() => {
        setEstado((prev) => {
          const dur = prev.cancionActual?.duracion || 0;
          const next = Math.min(dur, prev.tiempoActual + 1);
          return { ...prev, tiempoActual: next };
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [estado.estaReproduciendo, estado.cancionActual?.id]);

  useEffect(() => {
    const fetchInitialMusicState = async () => {
      try {
        setEstado((prev) => ({ ...prev, cargando: true, error: null }));
        const response = await axiosInstance.get("/music/now-playing");
        const data = response.data;

        if (data.status === "playing" || data.status === "paused") {
          const currentTrack: Cancion = {
            id: data.started_at,
            titulo: data.title,
            artista: data.uploader,
            urlYoutube: data.query,
            agregadoPor: data.started_by?.username || "Desconocido",
            duracion: data.duration,
            thumbnail: data.thumbnail,
            createdAt: data.started_at,
          };
          setEstado((prev) => ({
            ...prev,
            cancionActual: currentTrack,
            estaReproduciendo: data.status === "playing",
            tiempoActual: data.position || 0,
            volumen: data.volume || prev.volumen,
            cargando: false,
            cola: (data.queue || []).map((item: any) => ({
              id: item.id || item.started_at,
              titulo: item.title,
              artista: item.uploader,
              urlYoutube: item.query || item.url || "",
              agregadoPor: item.started_by?.username || "Desconocido",
              duracion: item.duration,
              thumbnail: item.thumbnail,
              createdAt: item.started_at,
            })),
            historial: (data.history || []).map((item: any) => ({
              id: item.id || `${item.title}-${item.uploader}-${item.duration}`,
              titulo: item.title,
              artista: item.uploader,
              urlYoutube: item.query || item.url || "",
              agregadoPor: item.started_by?.username || "Desconocido",
              duracion: item.duration,
              thumbnail: item.thumbnail,
              createdAt: item.started_at,
            })),
            lastAdded: null,
          }));
        } else {
          setEstado((prev) => ({
            ...prev,
            cancionActual: null,
            estaReproduciendo: false,
            tiempoActual: 0,
            cargando: false,
            cola: (data.queue || []).map((item: any) => ({
              id: item.id || item.started_at,
              titulo: item.title,
              artista: item.uploader,
              urlYoutube: item.query || item.url || "",
              agregadoPor: item.started_by?.username || "Desconocido",
              duracion: item.duration,
              thumbnail: item.thumbnail,
              createdAt: item.started_at,
            })),
            historial: (data.history || []).map((item: any) => ({
              id: item.id || `${item.title}-${item.uploader}-${item.duration}`,
              titulo: item.title,
              artista: item.uploader,
              urlYoutube: item.query || item.url || "",
              agregadoPor: item.started_by?.username || "Desconocido",
              duracion: item.duration,
              thumbnail: item.thumbnail,
              createdAt: item.started_at,
            })),
            lastAdded: null,
          }));
        }
      } catch (err) {
        console.error("Error al sincronizar el estado de la música:", err);
        setEstado((prev) => ({
          ...prev,
          cargando: false,
          error: "Error al cargar el estado de la música",
        }));
      }
    };
    fetchInitialMusicState();
  }, []);

  const cambiarVolumen = useCallback(async (nuevoVolumen: number) => {
    const volumenLimitado = Math.max(0, Math.min(100, nuevoVolumen));
    try {
      await axiosInstance.put("/music/volume", { volume: volumenLimitado });
      setEstado((prev) => ({
        ...prev,
        volumen: volumenLimitado,
      }));
    } catch (error) {
      console.error("Error al cambiar el volumen:", error);
      setEstado((prev) => ({
        ...prev,
        error: "Error al cambiar el volumen",
      }));
    }
  }, []);

  const reproducir = useCallback(async () => {
    if (estado.cancionActual) {
      try {
        await axiosInstance.post("/music/resume");
        setEstado((prev) => ({
          ...prev,
          estaReproduciendo: true,
          estaPausado: false,
          error: null,
        }));
      } catch (error) {
        console.error("Error al reanudar la reproducción:", error);
        setEstado((prev) => ({
          ...prev,
          error: "Error al reanudar la reproducción",
        }));
      }
    }
  }, [estado.cancionActual]);

  const pausar = useCallback(async () => {
    try {
      await axiosInstance.post("/music/pause");
      setEstado((prev) => ({
        ...prev,
        estaReproduciendo: false,
      }));
    } catch (error) {
      console.error("Error al pausar la reproducción:", error);
      setEstado((prev) => ({
        ...prev,
        error: "Error al pausar la reproducción",
      }));
    }
  }, []);

  const siguienteCancion = useCallback(async () => {
    try {
      await axiosInstance.post("/music/next");
      setEstado((prev) => ({
        ...prev,
        estaReproduciendo: true,
        tiempoActual: 0,
      }));
    } catch (error) {
      console.error("Error al saltar a la siguiente canción:", error);
      setEstado((prev) => ({
        ...prev,
        error: "Error al saltar a la siguiente canción",
      }));
    }
  }, []);

  const cancionAnterior = useCallback(async () => {
    try {
      await axiosInstance.post("/music/previous");
      setEstado((prev) => ({
        ...prev,
        estaReproduciendo: true,
        tiempoActual: 0,
      }));
    } catch (error) {
      console.error("Error al saltar a la canción anterior:", error);
      setEstado((prev) => ({
        ...prev,
        error: "Error al saltar a la canción anterior",
      }));
    }
  }, []);

  const agregarCancion = useCallback(
    async (query: string, agregadoPor: string) => {
      try {
        setEstado((prev) => ({ ...prev, error: null }));

        const response = await axiosInstance.post("/music/play", {
          query: query,
        });
        const cancionData = response.data;

        const nuevaCancion: Cancion = {
          id: cancionData.id || cancionData.started_at,
          titulo: cancionData.title,
          artista: cancionData.uploader,
          urlYoutube: cancionData.query,
          agregadoPor: agregadoPor,
          duracion: cancionData.duration,
          thumbnail: cancionData.thumbnail,
          createdAt: cancionData.started_at,
        };

        setEstado((prev) => ({
          ...prev,
          cola:
            cancionData.status === "queued"
              ? [...prev.cola, nuevaCancion]
              : cancionData.queue || prev.cola,
          cancionActual:
            cancionData.status === "playing"
              ? nuevaCancion
              : prev.cancionActual,
          estaReproduciendo: cancionData.status === "playing",
          lastAdded: null,
        }));

        return true;
      } catch (err) {
        setEstado((prev) => ({
          ...prev,
          error: "Error al agregar la canción",
        }));
        return false;
      }
    },
    []
  );

  const eliminarCancion = useCallback(async (id: string) => {
    setEstado((prev) => {
      const nuevaCola = prev.cola.filter((c) => c.id !== id);

      if (nuevaCola.length === 0) {
        return {
          ...prev,
          cola: [],
          cancionActual: null,
          indiceActual: 0,
          estaReproduciendo: false,
        };
      }

      if (prev.cancionActual?.id === id) {
        const nuevoIndice = Math.max(0, prev.indiceActual - 1);
        return {
          ...prev,
          cola: nuevaCola,
          cancionActual: nuevaCola[nuevoIndice] || null,
          indiceActual: nuevoIndice,
          estaReproduciendo: false,
        };
      }

      return {
        ...prev,
        cola: nuevaCola,
        indiceActual: Math.min(prev.indiceActual, nuevaCola.length - 1),
      };
    });
  }, []);

  const buscarPosicion = useCallback(async (position: number) => {
    try {
      await axiosInstance.put("/music/seek", { position });
      setEstado((prev) => ({ ...prev, tiempoActual: position }));
    } catch (error) {
      console.error("Error al buscar posición:", error);
      setEstado((prev) => ({ ...prev, error: "Error al cambiar posición" }));
    }
  }, []);

  const seleccionarCancion = useCallback(async (id: string) => {
    setEstado((prev) => {
      const indice = prev.cola.findIndex((c) => c.id === id);
      if (indice === -1) return prev;

      return {
        ...prev,
        cancionActual: prev.cola[indice],
        indiceActual: indice,
        tiempoActual: 0,
        estaReproduciendo: true,
      };
    });
  }, []);

  const detenerCancion = useCallback(async () => {
    try {
      await axiosInstance.post("/music/stop");
      setEstado((prev) => ({
        ...prev,
        cancionActual: null,
        estaReproduciendo: false,
        tiempoActual: 0,
        cola: [],
        indiceActual: 0,
        error: null,
        lastAdded: null,
      }));
    } catch (error) {
      console.error("Error al detener la reproducción:", error);
      setEstado((prev) => ({
        ...prev,
        error: "Error al detener la reproducción",
      }));
    }
  }, []);

  return {
    estado,
    cambiarVolumen,
    reproducir,
    pausar,
    siguienteCancion,
    cancionAnterior,
    agregarCancion,
    eliminarCancion,

    seleccionarCancion,
    detenerCancion,
    buscarPosicion,
  };
};
