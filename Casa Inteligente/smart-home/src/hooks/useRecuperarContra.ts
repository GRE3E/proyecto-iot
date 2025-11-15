"use client";
import { useState, useRef, useCallback } from "react";
import { axiosInstance } from "../services/authService";
import { encodeWAV } from "./useVoiceRecognition";

export type RecoveryStep = 1 | 2 | 3;
export type RecoveryMethod = "face" | "voice" | null;

export function useRecuperarContra() {
  // Estados principales
  const [step, setStep] = useState<RecoveryStep>(1);
  const [username, setUsername] = useState("");
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Estados de carga y validación
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados biométricos
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceWavBlobRef = useRef<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);

  const resampleTo16k = (input: Float32Array, sourceRate: number) => {
    const targetRate = 16000;
    if (sourceRate === targetRate) return input;
    const ratio = sourceRate / targetRate;
    const newLength = Math.round(input.length / ratio);
    const output = new Float32Array(newLength);
    let pos = 0;
    for (let i = 0; i < newLength; i++) {
      const nextPos = (i + 1) * ratio;
      const leftIndex = Math.floor(pos);
      const rightIndex = Math.min(input.length - 1, Math.floor(nextPos));
      const left = input[leftIndex];
      const right = input[rightIndex];
      const t = pos - leftIndex;
      output[i] = left + (right - left) * t;
      pos = nextPos;
    }
    return output;
  };

  // Validar usuario
  const handleValidateUsername = useCallback(async () => {
    if (!username.trim()) {
      setError("Por favor ingresa tu usuario");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // TODO: Conectar con API real
      // const response = await fetch('/api/validate-username', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username })
      // });

      // Simular validación de usuario en backend
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulación: validar que el usuario existe
      if (username.toLowerCase() === "admin" || username.toLowerCase() === "user") {
        setSuccess("Usuario validado correctamente ✓");
        setTimeout(() => {
          setStep(2);
          setSuccess("");
        }, 1000);
      } else {
        setError("Usuario no encontrado en el sistema");
      }
    } catch (err) {
      setError("Error al validar el usuario");
    } finally {
      setLoading(false);
    }
  }, [username]);

  // Iniciar reconocimiento facial
  const startFacialRecognition = useCallback(async () => {
    setBiometricLoading(true);
    setBiometricStatus("Iniciando cámara...");
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setBiometricStatus("Cámara iniciada. Por favor, mira a la cámara...");

        setTimeout(() => {
          captureAndAnalyzeFace();
        }, 3000);
      }
    } catch (err) {
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
      setBiometricLoading(false);
    }
  }, []);

  const captureAndAnalyzeFace = useCallback(async () => {
    setBiometricStatus("Analizando rostro...");

    try {
      // TODO: Conectar con API de reconocimiento facial
      // const response = await fetch('/api/facial-recognition', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username, videoFrame: canvasRef.current?.toDataURL() })
      // });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (Math.random() > 0.2) {
        setBiometricStatus("¡Rostro reconocido! ✓");
        stopCamera();
        setTimeout(() => {
          setStep(2);
          setBiometricLoading(false);
        }, 1500);
      } else {
        setBiometricStatus("No se pudo reconocer el rostro. Intenta de nuevo.");
        setBiometricLoading(false);
      }
    } catch (err) {
      setError("Error al procesar el reconocimiento facial");
      setBiometricLoading(false);
    }
  }, []);

  const startVoiceRecognition = useCallback(() => {
    setError("");
    setBiometricStatus("Listo para grabar. Pulsa Iniciar grabación.");
    setBiometricLoading(false);
    voiceWavBlobRef.current = null;
  }, []);

  const beginVoiceRecording = useCallback(async () => {
    setBiometricLoading(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;
      analyserRef.current.smoothingTimeConstant = 0.85;
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const SILENCE_THRESHOLD = 20;
      const SILENCE_DURATION = 3000;
      const RECORD_DURATION_MS = 5000;

      const checkSilence = () => {
        if (!analyserRef.current || !isRecording) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;
        if (average < SILENCE_THRESHOLD) {
          if (!silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              stopVoiceRecording();
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

      const mime = 'audio/webm;codecs=opus';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mime });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        const float32Array = decoded.getChannelData(0);
        const resampled = resampleTo16k(float32Array, ctx.sampleRate);
        const wavBlob = encodeWAV(resampled, 16000);
        const durationSec = resampled.length / 16000;
        if (durationSec < 2) {
          voiceWavBlobRef.current = null;
          setBiometricStatus("Audio demasiado corto. Intenta de nuevo.");
          setError("Graba al menos 2 segundos");
          setBiometricLoading(false);
          setIsRecording(false);
          setVoiceReady(false);
          try { await ctx.close(); } catch {}
          return;
        }
        voiceWavBlobRef.current = wavBlob;
        setBiometricStatus("Audio capturado ✓");
        setBiometricLoading(false);
        setIsRecording(false);
        setVoiceReady(true);
        try { await ctx.close(); } catch {}
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setBiometricStatus("Grabando...");
      if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
        recordTimeoutRef.current = null;
      }
      recordTimeoutRef.current = setTimeout(() => {
        stopVoiceRecording();
      }, RECORD_DURATION_MS);
    } catch (err) {
      setError("Error al iniciar la grabación de voz");
      setBiometricLoading(false);
      setIsRecording(false);
    }
  }, [isRecording]);

  const stopVoiceRecording = useCallback(() => {
    try {
      mediaRecorderRef.current?.stop();
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
        recordTimeoutRef.current = null;
      }
      setIsRecording(false);
    } catch {}
  }, []);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  // Cambiar contraseña
  const handleChangePassword = useCallback(async () => {
    if (!newPassword.trim()) {
      setError("Por favor ingresa la nueva contraseña");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (recoveryMethod === "voice" && !voiceWavBlobRef.current) {
      setError("Primero graba tu voz para verificar");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (recoveryMethod === "voice") {
        const formData = new FormData();
        const file = new File([voiceWavBlobRef.current as Blob], "audio.wav", { type: "audio/wav" });
        formData.append("audio_file", file);
        formData.append("new_password", newPassword);
        await axiosInstance.post("/auth/auth/voice-password-recovery", formData, {
          headers: { "Content-Type": "multipart/form-data", accept: "application/json" },
        });
      }

      setSuccess("¡Contraseña cambiada exitosamente! ✓");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (err: any) {
      let message = "Error al cambiar la contraseña";
      const d = err?.response?.data;
      if (d?.detail) {
        if (typeof d.detail === "string") message = d.detail;
        else if (Array.isArray(d.detail)) message = d.detail.map((e: any) => e?.msg || e?.type || "Error").join("; ");
      } else if (typeof err?.message === "string") {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [newPassword, confirmPassword, recoveryMethod]);

  // Resetear el proceso completo
  const resetProcess = useCallback(() => {
    setStep(1);
    setUsername("");
    setRecoveryMethod(null);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setBiometricStatus("");
    stopCamera();
    stopVoiceRecording();
    voiceWavBlobRef.current = null;
    setIsRecording(false);
    setVoiceReady(false);
  }, [stopCamera]);

  // Cambiar método biométrico
  const changeBiometricMethod = useCallback(() => {
    setRecoveryMethod(null);
    stopCamera();
    stopVoiceRecording();
    setError("");
    setBiometricStatus("");
    setBiometricLoading(false);
    setIsRecording(false);
    setVoiceReady(false);
  }, [stopCamera]);

  return {
    // Estados principales
    step,
    username,
    setUsername,
    recoveryMethod,
    setRecoveryMethod,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,

    // Estados de UI
    loading,
    error,
    setError,
    success,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,

    // Estados biométricos
    biometricLoading,
    biometricStatus,
    videoRef,
    canvasRef,

    // Funciones de manejo
    handleValidateUsername,
    startFacialRecognition,
    startVoiceRecognition,
    handleChangePassword,
    resetProcess,
    changeBiometricMethod,
    isRecording,
    beginVoiceRecording,
    stopVoiceRecording,
    voiceReady,
  };
}