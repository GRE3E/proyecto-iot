"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { axiosInstance } from "../services/authService";

import { useVoiceRecognition } from "./useVoiceRecognition";

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

  const voiceWavBlobRef = useRef<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    []
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const faceImageBlobRef = useRef<Blob | null>(null);
  const [faceReady, setFaceReady] = useState(false);
  const [pendingFaceSubmit, setPendingFaceSubmit] = useState(false);
  const [faceImageUrl, setFaceImageUrl] = useState<string | null>(null);

  const { startListening: startVR, stopListening: stopVR } =
    useVoiceRecognition({
      transcribePath: "/stt/stt/transcribe",
      maxDurationMs: 4000,
      onStart: () => {
        setBiometricLoading(true);
        setIsRecording(true);
        setBiometricStatus("Grabando...");
      },
      onEnd: () => {
        setIsRecording(false);
        setBiometricLoading(false);
      },
      onAudioCaptured: (wav) => {
        voiceWavBlobRef.current = wav;
        setBiometricStatus("Audio capturado ✓");
      },
      onAudioProcessed: (resp: any) => {
        const txt = String(resp?.transcribed_text || "").trim();
        setVoiceTranscript(txt);
        const normalizeTxt = (s: string) =>
          s
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const ok = normalizeTxt(txt).includes(
          normalizeTxt("soy parte del hogar")
        );
        if (ok) {
          setBiometricStatus("Frase detectada ✓");
          setVoiceReady(true);
        } else {
          setBiometricStatus(
            "No se detectó la frase correcta. Por favor di: 'soy parte del hogar'."
          );
          setVoiceReady(false);
        }
      },
    });

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
    setBiometricStatus(
      "Listo para grabar. Di la frase: 'soy parte del hogar'."
    );
    setBiometricLoading(false);
    voiceWavBlobRef.current = null;
    setVoiceReady(false);
    setVoiceTranscript("");
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

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const startFacePreview = useCallback(
    async (deviceId?: string | null) => {
      try {
        setBiometricLoading(true);
        setBiometricStatus("Iniciando cámara...");
        stopCamera();

        const tryGet = async (c: MediaStreamConstraints) => {
          try {
            return await navigator.mediaDevices.getUserMedia(c);
          } catch {
            return null;
          }
        };

        const useDeviceId = !!deviceId && String(deviceId).length > 0;
        const primary: MediaStreamConstraints = {
          video: useDeviceId
            ? ({ deviceId: { exact: deviceId } } as any)
            : { facingMode: "user" },
        };
        let stream = await tryGet(primary);
        if (!stream)
          stream = await tryGet({ video: { facingMode: "environment" } });
        if (!stream) stream = await tryGet({ video: true });
        if (!stream) throw new Error("No se pudo iniciar la cámara");

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            (videoRef.current as any).muted = true;
            (videoRef.current as any).playsInline = true;
            (videoRef.current as any).autoplay = true;
            videoRef.current.setAttribute("autoplay", "true");
          } catch {}
          try {
            await videoRef.current.play();
          } catch {}
        }
        setBiometricLoading(false);
        setBiometricStatus("Cámara lista");
        await enumerateCameras();
      } catch (err) {
        setError("No se pudo acceder a la cámara");
        setBiometricLoading(false);
      }
    },
    [enumerateCameras, stopCamera]
  );

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
    setError("");
    setBiometricStatus(
      "Listo para grabar. Di la frase: 'soy parte del hogar'."
    );
    setBiometricLoading(false);
    setVoiceTranscript("");
    setVoiceReady(false);
    startVR();
  }, [startVR]);

  const stopVoiceRecording = useCallback(() => {
    try {
      stopVR();
      setIsRecording(false);
    } catch {}
  }, [stopVR]);

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
                "Content-Type": undefined,
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

  const captureFaceSnapshot = useCallback(async () => {
    try {
      const imageBlob = await captureFrameBlob();
      if (!imageBlob) {
        setError("No se pudo capturar la imagen");
        return;
      }
      faceImageBlobRef.current = imageBlob;
      setFaceReady(true);
      try {
        if (faceImageUrl) URL.revokeObjectURL(faceImageUrl);
      } catch {}
      const url = URL.createObjectURL(imageBlob);
      setFaceImageUrl(url);
      setBiometricStatus("Foto capturada ✓");
    } catch {
      setError("Error al capturar la foto");
    }
  }, [faceImageUrl]);

  const retakeFaceSnapshot = useCallback(async () => {
    try {
      setFaceReady(false);
      try {
        if (faceImageUrl) URL.revokeObjectURL(faceImageUrl);
      } catch {}
      setFaceImageUrl(null);
      faceImageBlobRef.current = null;
      setBiometricStatus("Cámara lista");
      await startFacePreview(selectedCameraId);
    } catch {}
  }, [faceImageUrl, selectedCameraId, startFacePreview]);

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
              "Content-Type": undefined,
              accept: "application/json",
            },
          }
        );
      } else if (recoveryMethod === "face") {
        if (!faceImageBlobRef.current) {
          setError("Primero toma una foto de tu rostro");
          return;
        }
        const formData = new FormData();
        formData.append("new_password", newPassword);
        const imgFile = new File([faceImageBlobRef.current], "face.jpg", {
          type: "image/jpeg",
        });
        formData.append("image_file", imgFile);
        setLoading(true);
        await axiosInstance.post(
          "/auth/auth/face-password-recovery",
          formData,
          {
            params: { source: "file" },
            headers: {
              "Content-Type": undefined,
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
    try {
      if (faceImageUrl) URL.revokeObjectURL(faceImageUrl);
    } catch {}
    setFaceImageUrl(null);
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
    try {
      if (faceImageUrl) URL.revokeObjectURL(faceImageUrl);
    } catch {}
    setFaceImageUrl(null);
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
    voiceTranscript,
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
    captureFaceSnapshot,
    retakeFaceSnapshot,
    faceReady,
    faceImageUrl,
  };
}
