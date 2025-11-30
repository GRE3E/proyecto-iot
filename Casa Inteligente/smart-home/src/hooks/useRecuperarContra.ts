"use client";
import { useState, useRef, useCallback, useEffect } from "react";
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
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    []
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const faceImageBlobRef = useRef<Blob | null>(null);
  const [faceReady, setFaceReady] = useState(false);
  const [pendingFaceSubmit, setPendingFaceSubmit] = useState(false);

  const captureFrameBlob = async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return null;
    ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.95);
    });
  };

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
      if (
        username.toLowerCase() === "admin" ||
        username.toLowerCase() === "user"
      ) {
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

  const startFacialRecognition = useCallback(async () => {
    setError("");
    setBiometricStatus("");
    setStep(2);
  }, []);

  const startVoiceRecognition = useCallback(() => {
    setError("");
    setBiometricStatus("Listo para grabar. Di la frase: 'Murphy soy parte del hogar'.");
    setBiometricLoading(false);
    voiceWavBlobRef.current = null;
    setVoiceReady(false);
  }, []);

  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");
      setAvailableCameras(cams);
      if (!selectedCameraId && cams.length > 0)
        setSelectedCameraId(cams[0].deviceId);
    } catch {}
  }, [selectedCameraId]);

  const startFacePreview = useCallback(async (deviceId?: string | null) => {
    try {
      setBiometricLoading(true);
      setBiometricStatus("Iniciando cámara...");
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } as any }
          : { facingMode: "user" },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setBiometricLoading(false);
      setBiometricStatus("Cámara lista");
    } catch (err) {
      setError("No se pudo acceder a la cámara");
      setBiometricLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      if (step === 2 && recoveryMethod === "face") {
        await enumerateCameras();
        await startFacePreview(selectedCameraId);
      }
    };
    run();
  }, [
    step,
    recoveryMethod,
    enumerateCameras,
    startFacePreview,
    selectedCameraId,
  ]);

  const openFaceModal = useCallback(async () => {
    try {
      setFaceReady(false);
      setFaceModalOpen(true);
      await startFacePreview(selectedCameraId);
      await enumerateCameras();
    } catch {}
  }, [selectedCameraId, startFacePreview, enumerateCameras]);

  const updateSelectedCamera = useCallback(
    async (id: string) => {
      setSelectedCameraId(id);
      await startFacePreview(id);
    },
    [startFacePreview]
  );

  const beginVoiceRecording = useCallback(async () => {
    setBiometricLoading(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
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

      const mime = "audio/webm;codecs=opus";
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mime });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const targetPhrase = normalize("murphy soy parte del hogar");
      let recognition: any = null;
      if (SpeechRecognitionClass) {
        recognition = new SpeechRecognitionClass();
        recognition.lang = "es-ES";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (ev: any) => {
          const txt = Array.from(ev.results).map((r: any) => r[0]?.transcript || "").join(" ");
          const ok = normalize(txt).includes(targetPhrase);
          if (ok) {
            setBiometricStatus("Frase detectada ✓");
            setVoiceReady(true);
          } else {
            setBiometricStatus("Frase incorrecta. Intenta nuevamente.");
            setVoiceReady(false);
          }
        };
        try { recognition.start(); } catch {}
      } else {
        setBiometricStatus("Tu navegador no soporta reconocimiento de voz. Intenta decir claramente la frase.");
      }
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const ctx = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
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
          try {
            await ctx.close();
          } catch {}
          return;
        }
        voiceWavBlobRef.current = wavBlob;
        setBiometricStatus("Audio capturado ✓");
        setBiometricLoading(false);
        setIsRecording(false);
        try {
          await ctx.close();
        } catch {}
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
        try { (recognition as any)?.stop?.(); } catch {}
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

  const closeFaceModal = useCallback(() => {
    setFaceModalOpen(false);
    stopCamera();
    setBiometricStatus("");
    setBiometricLoading(false);
    setPendingFaceSubmit(false);
  }, [stopCamera]);

  const confirmFaceCapture = useCallback(async () => {
    try {
      const imageBlob = await captureFrameBlob();
      if (!imageBlob) {
        setError("No se pudo capturar la imagen");
        return;
      }
      faceImageBlobRef.current = imageBlob;
      setFaceReady(true);
      setFaceModalOpen(false);
      stopCamera();
      if (pendingFaceSubmit) {
        const formData = new FormData();
        formData.append("new_password", newPassword);
        const imgFile = new File([imageBlob], "face.jpg", {
          type: "image/jpeg",
        });
        formData.append("image_file", imgFile);
        try {
          setLoading(true);
          await axiosInstance.post(
            "/auth/auth/face-password-recovery",
            formData,
            {
              params: { source: "file" },
              headers: {
                "Content-Type": "multipart/form-data",
                accept: "application/json",
              },
            }
          );
          setSuccess("¡Contraseña cambiada exitosamente! ✓");
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        } catch (err: any) {
          let message = "Error al cambiar la contraseña";
          const d = err?.response?.data;
          if (d?.detail) {
            if (typeof d.detail === "string") message = d.detail;
            else if (Array.isArray(d.detail))
              message = d.detail
                .map((e: any) => e?.msg || e?.type || "Error")
                .join("; ");
          } else if (typeof err?.message === "string") {
            message = err.message;
          }
          setError(message);
        } finally {
          setLoading(false);
          setPendingFaceSubmit(false);
        }
      }
    } catch {}
  }, [newPassword, pendingFaceSubmit, stopCamera]);

  // Cambiar contraseña
  const handleChangePassword = useCallback(async () => {
    if (!newPassword.trim()) {
      setError("Por favor ingresa la nueva contraseña");
      return;
    }

    // No se requiere longitud mínima

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (recoveryMethod === "voice" && !voiceWavBlobRef.current) {
      setError("Primero graba tu voz para verificar");
      return;
    }

    setError("");

    try {
      if (recoveryMethod === "voice") {
        setLoading(true);
        const formData = new FormData();
        const file = new File([voiceWavBlobRef.current as Blob], "audio.wav", {
          type: "audio/wav",
        });
        formData.append("audio_file", file);
        formData.append("new_password", newPassword);
        await axiosInstance.post(
          "/auth/auth/voice-password-recovery",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              accept: "application/json",
            },
          }
        );
      } else if (recoveryMethod === "face") {
        const blob = await captureFrameBlob();
        if (!blob) {
          setError("Activa la cámara para capturar tu rostro");
          await enumerateCameras();
          await startFacePreview(selectedCameraId);
          return;
        }
        const formData = new FormData();
        formData.append("new_password", newPassword);
        const imgFile = new File([blob], "face.jpg", { type: "image/jpeg" });
        formData.append("image_file", imgFile);
        setLoading(true);
        await axiosInstance.post(
          "/auth/auth/face-password-recovery",
          formData,
          {
            params: { source: "file" },
            headers: {
              "Content-Type": "multipart/form-data",
              accept: "application/json",
            },
          }
        );
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
        else if (Array.isArray(d.detail))
          message = d.detail
            .map((e: any) => e?.msg || e?.type || "Error")
            .join("; ");
      } else if (typeof err?.message === "string") {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    newPassword,
    confirmPassword,
    recoveryMethod,
    enumerateCameras,
    startFacePreview,
    selectedCameraId,
  ]);

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
    faceImageBlobRef.current = null;
    setFaceReady(false);
    setFaceModalOpen(false);
    setAvailableCameras([]);
    setSelectedCameraId(null);
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
    faceModalOpen,
    availableCameras,
    selectedCameraId,
    updateSelectedCamera,
    openFaceModal,
    closeFaceModal,
    confirmFaceCapture,
    faceReady,
  };
}
