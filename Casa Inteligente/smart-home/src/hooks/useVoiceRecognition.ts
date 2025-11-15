import { useState, useRef, useEffect, useCallback } from "react";
import { axiosInstance } from "../services/authService";

interface UseVoiceRecognitionProps {
  lang?: string;
  onResult?: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onAudioProcessed?: (apiResponse: any) => void; // Cambiado para recibir la respuesta de la API
}

// Función auxiliar para codificar audio a WAV
const encodeWAV = (samples: Float32Array, sampleRate: number) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return new Blob([view], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, str: string) => {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
};

const floatTo16BitPCM = (view: DataView, offset: number, input: Float32Array) => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
};

interface UseVoiceRecognitionProps {
  lang?: string;
  onResult?: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useVoiceRecognition({
  lang = "es-PE",
  onResult,
  onStart,
  onEnd,
  onAudioProcessed, // Nuevo callback para cuando el audio es procesado y enviado
}: UseVoiceRecognitionProps = {}) {
  const [listening, setListening] = useState(false);
  const listeningStateRef = useRef(listening);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // En navegador, setTimeout devuelve number; usar ReturnType para compatibilidad
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    listeningStateRef.current = listening;
  }, [listening]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setListening(true);
      onStart?.();
    };

    recognition.onend = () => {
      if (listeningStateRef.current) {
        // recognitionRef.current?.start(); // No reiniciar SpeechRecognition aquí, MediaRecorder controlará la duración
      } else {
        setListening(false);
        onEnd?.();
      }
    };

    recognition.onerror = (event: any) => {
      console.error("SpeechRecognition Error:", event.error);
      if (event.error === "no-speech") {
        // Si no se detecta habla, detener la grabación
        stopListening();
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      onResult?.(transcript);
    };

    recognitionRef.current = recognition;
  }, [lang, onStart, onEnd, onResult]);

  const startListening = async () => {
    try {
      // Limpiar cualquier temporizador de silencio anterior
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // Iniciar grabación de audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Configurar AudioContext y AnalyserNode para detección de silencio
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.minDecibels = -90; // Nivel mínimo de decibelios
      analyserRef.current.maxDecibels = -10; // Nivel máximo de decibelios
      analyserRef.current.smoothingTimeConstant = 0.85; // Suavizado
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const SILENCE_THRESHOLD = 20; // Umbral de silencio (ajustar según sea necesario)
      const SILENCE_DURATION = 1500; // Duración de silencio en ms para detener la grabación

      const checkSilence = () => {
        if (!analyserRef.current || !listeningStateRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;
        console.log("Audio average:", average, "Silence threshold:", SILENCE_THRESHOLD, "Silence timeout active:", !!silenceTimeoutRef.current);

        if (average < SILENCE_THRESHOLD) {
          if (!silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              if (listeningStateRef.current) {
                console.log("Silencio detectado, deteniendo grabación.");
                stopListening();
              }
            }, SILENCE_DURATION);
          }
        } else {
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        }
        requestAnimationFrame(checkSilence);
      };

      checkSilence();

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log("Audio chunks collected:", audioChunksRef.current.length);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        console.log("Audio Blob size:", audioBlob.size, "type:", audioBlob.type);
        
        // Convertir a WAV
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
        const float32Array = decodedAudio.getChannelData(0); // Asumiendo un solo canal
        const wavBlob = encodeWAV(float32Array, audioContext.sampleRate);
        console.log("WAV Blob size:", wavBlob.size, "type:", wavBlob.type);

        // Enviar el archivo WAV a la API
        const formData = new FormData();
        formData.append('audio_file', wavBlob, 'audio.wav');

        try {
          const response = await axiosInstance.post(
            `/hotword/hotword/process_audio/auth`,
            formData,
            {
              headers: {
                accept: "application/json",
                // No establecer 'Content-Type' manualmente; axios lo gestiona con FormData
              },
            }
          );

          const data = response.data;
          console.log("Audio Processed API Response:", data);
          if (onAudioProcessed) {
            onAudioProcessed(data);
          }
        } catch (error) {
          console.error("Error sending audio to AI:", error);
        }
      };

      mediaRecorderRef.current.start();
      recognitionRef.current?.start();
    } catch (err) {
      console.warn("SpeechRecognition or MediaRecorder start error:", err);
    }
  };

  const stopListening = () => {
    console.log("Stopping listening...");
    try {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(track => track.stop()); // Detener la pista de audio
      audioContextRef.current?.close(); // Cerrar AudioContext
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      setListening(false);
      onEnd?.();
    } catch (err) {
      console.warn("SpeechRecognition or MediaRecorder stop error:", err);
    }
  };

  return { listening, startListening, stopListening };
}
