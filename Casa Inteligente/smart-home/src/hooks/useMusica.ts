import { useState, useCallback, useRef, useEffect } from 'react';

export interface Cancion {
  id: string;
  titulo: string;
  artista: string;
  urlYoutube: string;
  agregadoPor: string;
  duracion: number;
  createdAt?: string;
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
}

// Función para extraer ID de YouTube y generar URL de audio
const obtenerUrlAudioYoutube = (url: string): string | null => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Función para obtener thumbnail de YouTube
const obtenerThumbnailYoutube = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

export const useMusica = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
  });

  // Inicializar elemento de audio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';
      
      audioRef.current.addEventListener('timeupdate', () => {
        setEstado((prev) => ({
          ...prev,
          tiempoActual: Math.floor(audioRef.current?.currentTime || 0),
        }));
      });

      audioRef.current.addEventListener('ended', () => {
        siguienteCancion();
      });

      audioRef.current.addEventListener('error', (e) => {
        console.error('Error de audio:', e);
        setEstado((prev) => ({
          ...prev,
          estaReproduciendo: false,
          error: 'Error al reproducir la canción',
        }));
      });
    }
  }, []);

  // Cargar canciones del backend
  useEffect(() => {
    const cargarCanciones = async () => {
      try {
        setEstado((prev) => ({ ...prev, cargando: true, error: null }));
        
        // const response = await fetch('/api/musica');
        // const canciones = await response.json();
        
        // Datos simulados para testing
        const canciones: Cancion[] = [
          {
            id: '1',
            titulo: 'Blinding Lights',
            artista: 'The Weeknd',
            urlYoutube: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ',
            agregadoPor: 'Admin',
            duracion: 200,
          },
          {
            id: '2',
            titulo: 'Shape of You',
            artista: 'Ed Sheeran',
            urlYoutube: 'https://www.youtube.com/watch?v=JGwWNGJdvx8',
            agregadoPor: 'Juan',
            duracion: 234,
          },
        ];

        setEstado((prev) => ({
          ...prev,
          cola: canciones,
          cancionActual: canciones[0] || null,
          cargando: false,
        }));
      } catch (err) {
        setEstado((prev) => ({
          ...prev,
          cargando: false,
          error: 'Error al cargar las canciones',
        }));
      }
    };

    cargarCanciones();
  }, []);

  // Sincronizar reproducción con el elemento de audio
  useEffect(() => {
    if (!audioRef.current || !estado.cancionActual) return;

    const audio = audioRef.current;
    audio.volume = estado.volumen / 100;

    if (estado.estaReproduciendo) {
      // Generar URL de audio desde YouTube usando API gratuita
      const videoId = obtenerUrlAudioYoutube(estado.cancionActual.urlYoutube);
      if (videoId) {
        // Usar servicio para extraer audio de YouTube
        audio.src = `https://www.youtube.com/watch?v=${videoId}`;
        
        // Intentar reproducir
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Reproducción iniciada');
            })
            .catch((error) => {
              console.error('Error al reproducir:', error);
              setEstado((prev) => ({
                ...prev,
                estaReproduciendo: false,
                error: 'No se pudo reproducir la canción',
              }));
            });
        }
      }
    } else {
      audio.pause();
    }
  }, [estado.estaReproduciendo, estado.cancionActual, estado.volumen]);

  const cambiarVolumen = useCallback((nuevoVolumen: number) => {
    const volumenLimitado = Math.max(0, Math.min(100, nuevoVolumen));
    setEstado((prev) => ({
      ...prev,
      volumen: volumenLimitado,
    }));
    if (audioRef.current) {
      audioRef.current.volume = volumenLimitado / 100;
    }
  }, []);

  const reproducir = useCallback(() => {
    if (estado.cancionActual) {
      setEstado((prev) => ({
        ...prev,
        estaReproduciendo: true,
        error: null,
      }));
    }
  }, [estado.cancionActual]);

  const pausar = useCallback(() => {
    setEstado((prev) => ({
      ...prev,
      estaReproduciendo: false,
    }));
  }, []);

  const siguienteCancion = useCallback(() => {
    setEstado((prev) => {
      if (prev.cola.length === 0) return prev;

      const nuevoIndice = (prev.indiceActual + 1) % prev.cola.length;
      const nuevaCancion = prev.cola[nuevoIndice];

      return {
        ...prev,
        cancionActual: nuevaCancion,
        indiceActual: nuevoIndice,
        historial:
          prev.cancionActual
            ? [prev.cancionActual, ...prev.historial].slice(0, 20)
            : prev.historial,
        tiempoActual: 0,
        estaReproduciendo: true,
      };
    });
  }, []);

  const cancionAnterior = useCallback(() => {
    setEstado((prev) => {
      if (prev.cola.length === 0) return prev;

      const nuevoIndice =
        prev.indiceActual === 0 ? prev.cola.length - 1 : prev.indiceActual - 1;
      const nuevaCancion = prev.cola[nuevoIndice];

      return {
        ...prev,
        cancionActual: nuevaCancion,
        indiceActual: nuevoIndice,
        tiempoActual: 0,
        estaReproduciendo: true,
      };
    });
  }, []);

  const agregarCancion = useCallback(
    async (urlYoutube: string, agregadoPor: string) => {
      try {
        setEstado((prev) => ({ ...prev, error: null }));

        const videoId = obtenerUrlAudioYoutube(urlYoutube);
        if (!videoId) {
          setEstado((prev) => ({
            ...prev,
            error: 'URL de YouTube inválida',
          }));
          return false;
        }

        // const response = await fetch('/api/musica', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ urlYoutube, agregadoPor }),
        // });
        // const cancionData = await response.json();

        const nuevaCancion: Cancion = {
          id: Date.now().toString(),
          titulo: 'Canción desde YouTube',
          artista: 'Artista',
          urlYoutube,
          agregadoPor,
          duracion: 0,
          createdAt: new Date().toISOString(),
        };

        setEstado((prev) => ({
          ...prev,
          cola: [...prev.cola, nuevaCancion],
        }));

        return true;
      } catch (err) {
        setEstado((prev) => ({
          ...prev,
          error: 'Error al agregar la canción',
        }));
        return false;
      }
    },
    []
  );

  const eliminarCancion = useCallback((id: string) => {
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

  const actualizarTiempo = useCallback((tiempo: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = tiempo;
      setEstado((prev) => ({
        ...prev,
        tiempoActual: tiempo,
      }));
    }
  }, []);

  const seleccionarCancion = useCallback((id: string) => {
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

  return {
    estado,
    cambiarVolumen,
    reproducir,
    pausar,
    siguienteCancion,
    cancionAnterior,
    agregarCancion,
    eliminarCancion,
    actualizarTiempo,
    seleccionarCancion,
  };
};