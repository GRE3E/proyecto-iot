"use client";
import { useState, useRef, useCallback } from "react";

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

        // Simular captura y análisis de rostro
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

      // Simular análisis de rostro
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simular reconocimiento exitoso (80% de éxito)
      if (Math.random() > 0.2) {
        setBiometricStatus("¡Rostro reconocido! ✓");
        stopCamera();
        setTimeout(() => {
          setStep(3);
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

  // Iniciar reconocimiento de voz
  const startVoiceRecognition = useCallback(async () => {
    setBiometricLoading(true);
    setBiometricStatus("Iniciando micrófono...");
    setError("");

    try {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

      if (!SpeechRecognition) {
        setError("El reconocimiento de voz no es soportado en tu navegador");
        setBiometricLoading(false);
        return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.language = "es-ES";
      recognitionRef.current.continuous = false;

      recognitionRef.current.onstart = () => {
        setBiometricStatus("Escuchando... Por favor, di tu nombre de usuario");
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        analyzeVoice(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        setError(`Error en el reconocimiento: ${event.error}`);
        setBiometricLoading(false);
      };

      recognitionRef.current.start();
    } catch (err) {
      setError("Error al iniciar el reconocimiento de voz");
      setBiometricLoading(false);
    }
  }, []);

  const analyzeVoice = useCallback(
    async (transcript: string) => {
      setBiometricStatus("Analizando voz...");

      try {
        // TODO: Conectar con API de reconocimiento de voz
        // const response = await fetch('/api/voice-recognition', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ username, transcript })
        // });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Simular verificación de voz (80% de éxito)
        if (transcript.includes(username.toLowerCase()) && Math.random() > 0.2) {
          setBiometricStatus("¡Voz reconocida! ✓");
          setTimeout(() => {
            setStep(3);
            setBiometricLoading(false);
          }, 1500);
        } else {
          setBiometricStatus("No se pudo verificar la voz. Intenta de nuevo.");
          setBiometricLoading(false);
        }
      } catch (err) {
        setError("Error al procesar el reconocimiento de voz");
        setBiometricLoading(false);
      }
    },
    [username]
  );

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

    setLoading(true);
    setError("");

    try {
      // TODO: Conectar con API real para cambiar contraseña
      // const response = await fetch('/api/change-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username, newPassword })
      // });

      // Simular cambio de contraseña en backend
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccess("¡Contraseña cambiada exitosamente! ✓");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      setError("Error al cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  }, [newPassword, confirmPassword]);

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
  }, [stopCamera]);

  // Cambiar método biométrico
  const changeBiometricMethod = useCallback(() => {
    setRecoveryMethod(null);
    stopCamera();
    setError("");
    setBiometricStatus("");
    setBiometricLoading(false);
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
  };
}