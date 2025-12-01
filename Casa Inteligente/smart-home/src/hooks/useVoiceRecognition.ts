import { useState, useRef, useEffect } from "react";
import { axiosInstance } from "../services/authService";

interface UseVoiceRecognitionProps {
  onStart?: () => void;
  onEnd?: () => void;
  onAudioProcessed?: (apiResponse: any) => void;
  onAudioCaptured?: (wavBlob: Blob) => void;
  transcribePath?: string;
  maxDurationMs?: number;
}

// Función auxiliar para codificar audio a WAV
export const encodeWAV = (samples: Float32Array, sampleRate: number) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
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
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return new Blob([view], { type: "audio/wav" });
};

const writeString = (view: DataView, offset: number, str: string) => {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
};

const floatTo16BitPCM = (
  view: DataView,
  offset: number,
  input: Float32Array
) => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
};

export function useVoiceRecognition({
  onStart,
  onEnd,
  onAudioProcessed,
  onAudioCaptured,
  transcribePath,
  maxDurationMs,
}: UseVoiceRecognitionProps = {}) {
  const [listening, setListening] = useState(false);
  const listeningStateRef = useRef(listening);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // En navegador, setTimeout devuelve number; usar ReturnType para compatibilidad
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listeningStateRef.current = listening;
  }, [listening]);

  const startListening = async () => {
    try {
      // Limpiar cualquier temporizador de silencio anterior
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
        recordTimeoutRef.current = null;
      }

      // Iniciar grabación de audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Configurar AudioContext y AnalyserNode para detección de silencio
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
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
        console.log(
          "Audio average:",
          average,
          "Silence threshold:",
          SILENCE_THRESHOLD,
          "Silence timeout active:",
          !!silenceTimeoutRef.current
        );

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
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        console.log(
          "Audio Blob size:",
          audioBlob.size,
          "type:",
          audioBlob.type
        );

        // Convertir a WAV
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
        const float32Array = decodedAudio.getChannelData(0); // Asumiendo un solo canal
        const wavBlob = encodeWAV(float32Array, audioContext.sampleRate);
        console.log("WAV Blob size:", wavBlob.size, "type:", wavBlob.type);
        try {
          onAudioCaptured?.(wavBlob);
        } catch {}

        // Enviar el archivo WAV a la API
        const formData = new FormData();
        formData.append("audio_file", wavBlob, "audio.wav");

        // Log para debugging
        console.log("Preparando para enviar audio a la API");
        console.log("WAV Blob info:", {
          size: wavBlob.size,
          type: wavBlob.type,
        });
        console.log(
          "Token disponible:",
          !!localStorage.getItem("access_token")
        );

        try {
          const response = await axiosInstance.post(
            `${transcribePath ?? "/hotword/hotword/process_audio/auth"}`,
            formData,
            {
              headers: {
                // IMPORTANTE: No establecer 'Content-Type' manualmente
                // El browser debe establecerlo con el boundary correcto para FormData
                "Content-Type": undefined,
              },
            }
          );

          let data = response.data;
          if (
            data &&
            typeof data === "object" &&
            typeof (data as any).text === "string" &&
            !(data as any).transcribed_text
          ) {
            data = { ...data, transcribed_text: (data as any).text };
          }
          console.log("Audio Processed API Response:", data);
          if (onAudioProcessed) {
            onAudioProcessed(data);
          }
        } catch (error: any) {
          console.error("Error sending audio to AI:", error);
          if (error.response) {
            console.error("Error response data:", error.response.data);
            console.error("Error response status:", error.response.status);
            console.error("Error response headers:", error.response.headers);
          }
        }
      };

      mediaRecorderRef.current.start();
      setListening(true);
      onStart?.();

      const duration = typeof maxDurationMs === "number" ? maxDurationMs : 4000;
      recordTimeoutRef.current = setTimeout(() => {
        try {
          stopListening();
        } catch {}
      }, duration);
    } catch (err) {
      console.warn("SpeechRecognition or MediaRecorder start error:", err);
    }
  };

  const stopListening = () => {
    console.log("Stopping listening...");
    try {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop()); // Detener la pista de audio
      audioContextRef.current?.close(); // Cerrar AudioContext
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
        recordTimeoutRef.current = null;
      }
      setListening(false);
      onEnd?.();
    } catch (err) {
      console.warn("SpeechRecognition or MediaRecorder stop error:", err);
    }
  };

  return { listening, startListening, stopListening };
}
