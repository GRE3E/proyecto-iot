"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { axiosInstance } from "../services/authService";
import type { FamilyMember } from "../components/UI/Perfil";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useConfiguracion() {
  const { user, checkAuth } = useAuth();
  const [ownerName, setOwnerName] = useState("Usuario Principal");
  const [ownerPassword, setOwnerPassword] = useState("contraseña123");
  const [ownerUsernames, setOwnerUsernames] = useState<string[]>([]);
  const [language, setLanguage] = useState("es");
  const [timezone, setTimezone] = useState("GMT-5");
  const [notifications, setNotifications] = useState(true);
  const [members, setMembers] = useState<FamilyMember[]>([]);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [changeVoiceModalOpen, setChangeVoiceModalOpen] = useState(false);
  const [changeFaceModalOpen, setChangeFaceModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const recordTimeoutRef = useRef<any>(null);
  const RECORD_DURATION_MS = 5000;

  const [modalOwnerName, setModalOwnerName] = useState(ownerName);
  const [modalPassword, setModalPassword] = useState("");
  const [modalCurrentPassword, setModalCurrentPassword] = useState("");
  const [modalTimezone, setModalTimezone] = useState(timezone);

  // Derivar si el usuario actual es owner desde el perfil
  const isCurrentUserOwner = useMemo(() => {
    try {
      return Boolean(user?.user?.is_owner);
    } catch {
      return false;
    }
  }, [user]);

  // Setear el nombre del propietario desde el perfil autenticado
  useEffect(() => {
    if (user?.user?.username) {
      setOwnerName(user.user.username);
    }
  }, [user]);

  // Cargar lista de propietarios desde el backend
  const refreshOwners = async () => {
    try {
      const { data } = await axiosInstance.get<string[]>("/auth/auth/owners");
      if (Array.isArray(data)) {
        setOwnerUsernames(data);
      }
    } catch (e) {
      console.warn("No se pudo cargar la lista de propietarios", e);
    }
  };
  useEffect(() => {
    refreshOwners();
  }, [user]);

  // Cargar miembros (no propietarios) desde el backend
  const refreshMembers = async () => {
    try {
      const { data } = await axiosInstance.get<
        { id: number; username: string; is_owner: boolean }[]
      >("/auth/auth/members");
      if (Array.isArray(data)) {
        const mapped: FamilyMember[] = data.map((u) => ({
          id: String(u.id),
          name: u.username,
          role: "Familiar",
          privileges: { controlDevices: false, viewCamera: true },
        }));
        setMembers(mapped);
      }
    } catch (e) {
      console.warn("No se pudo cargar la lista de familiares", e);
    }
  };
  useEffect(() => {
    refreshMembers();
  }, [user]);

  // Escuchar solicitudes de refresco desde componentes hijos
  useEffect(() => {
    const handler = () => refreshOwners();
    if (typeof window !== "undefined") {
      window.addEventListener("refreshOwners", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("refreshOwners", handler);
      }
    };
  }, [user]);

  // Escuchar refresco de miembros desde componentes hijos
  useEffect(() => {
    const handler = () => refreshMembers();
    if (typeof window !== "undefined") {
      window.addEventListener("refreshMembers", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("refreshMembers", handler);
      }
    };
  }, [user]);

  // ✏️ Editar perfil
  const handleEditProfile = () => {
    setModalOwnerName(ownerName);
    setModalPassword("");
    setModalCurrentPassword("");
    setModalTimezone(timezone);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!modalOwnerName.trim()) {
      alert("El nombre no puede quedar vacío.");
      return;
    }
    if (!modalCurrentPassword.trim()) {
      alert("Para actualizar tu perfil, confirma tu contraseña actual.");
      return;
    }

    try {
      // Actualizar username si cambió
      const currentUsername = user?.user?.username;
      if (currentUsername && modalOwnerName.trim() !== currentUsername) {
        await axiosInstance.post("/auth/auth/update-username", {
          new_username: modalOwnerName.trim(),
          current_password: modalCurrentPassword.trim(),
        });
        setOwnerName(modalOwnerName.trim());
        await checkAuth();
      }

      // Actualizar contraseña si se ingresó nueva
      if (modalPassword.trim()) {
        await axiosInstance.post("/auth/auth/update-password", {
          new_password: modalPassword.trim(),
          current_password: modalCurrentPassword.trim(),
        });
        setOwnerPassword(modalPassword.trim());
      }

      setTimezone(modalTimezone);
      // Refrescar perfil global por si hubo cambios de contraseña u otros
      await checkAuth();
      setIsProfileModalOpen(false);
    } catch (e: any) {
      const message =
        e?.response?.data?.detail || e?.message || "Error al actualizar perfil";
      alert(message);
    }
  };

  // 📝 Flujo del registro paso a paso
  const [currentStep, setCurrentStep] = useState(1);
  const [newMember, setNewMember] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    isAdmin: false,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [voiceConfirmed, setVoiceConfirmed] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isRegisteringMember, setIsRegisteringMember] = useState(false);

  // ✅ Validación de usuario y contraseña
  const handleAccountStep = () => {
    if (!newMember.username || !newMember.password) {
      setErrorMessage("Completa todos los campos.");
      return;
    }
    setErrorMessage("");
    // Registro directo sin pasos adicionales (voz/rostro)
    handleFinalizeMember();
  };

  // 🎙️ Reconocimiento de voz mejorado - Frase natural
  const handleVoiceRecognitionEnhanced = () => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "es-ES";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setStatusMessage(
        "🎙️ Escuchando... Di la frase: 'Murphy soy parte del hogar' para registrar tu voz."
      );
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript.trim();
      setTranscript(result);
      setStatusMessage("🔄 Procesando voz...");

      const lower = result.toLowerCase();
      if (lower.includes("murphy") && lower.includes("soy parte del hogar")) {
        setStatusMessage(`✅ Voz registrada correctamente: "${result}"`);
        setVoiceConfirmed(true);
      } else {
        setStatusMessage(
          "❌ No se detectó la frase correcta. Por favor di: 'Murphy soy parte del hogar'."
        );
      }
    };

    recognition.onerror = () => {
      setStatusMessage("⚠️ Ocurrió un error con el reconocimiento de voz.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!statusMessage.includes("✅")) {
        setStatusMessage("🎤 Reconocimiento finalizado.");
      }
    };

    recognition.start();
  };

  // 🎙️ Cambiar voz del propietario
  const handleChangeVoice = () => {
    if (!voicePasswordVerified) {
      alert("Primero verifica tu contraseña actual para agregar tu voz.");
      return;
    }
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition: any = null;
    if (SpeechRecognitionClass) {
      recognition = new SpeechRecognitionClass();
      recognition.lang = "es-ES";
      recognition.continuous = false;
      recognition.interimResults = false;
    }

    const startRecording = async () => {
      setIsListening(true);
      setTranscript("");
      setStatusMessage(
        "🎙️ Escuchando... Di la frase: 'Murphy soy parte del hogar' para cambiar tu voz."
      );

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const rec = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        rec.onstop = async () => {
          const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          setVoiceBlob(blob);
          setIsRecording(false);
          if (!recognition) {
            try {
              const wavBlob = await convertBlobToWav(blob);
              const fd = new FormData();
              fd.append("audio_file", wavBlob, "audio.wav");
              const resp = await axiosInstance.post(
                "/hotword/hotword/process_audio/auth",
                fd,
                { headers: { "Content-Type": undefined } }
              );
              const txt = String(resp?.data?.transcribed_text || "").trim();
              setTranscript(txt);
              const normalize = (s: string) =>
                s
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "");
              const ok = normalize(txt).includes(
                normalize("murphy soy parte del hogar")
              );
              if (ok) {
                setStatusMessage(`✅ Frase detectada: "${txt}"`);
                setVoiceConfirmed(true);
              } else {
                setStatusMessage(
                  "❌ No se detectó la frase correcta. Por favor di: 'Murphy soy parte del hogar'."
                );
              }
            } catch {
              setStatusMessage(
                "⚠️ No se pudo transcribir el audio, pero se capturó correctamente. Puedes guardar tu voz."
              );
              setVoiceConfirmed(true);
            }
          }
        };
        rec.start(200);
        setMediaRecorder(rec);
        setIsRecording(true);
        if (recordTimeoutRef.current) {
          clearTimeout(recordTimeoutRef.current);
          recordTimeoutRef.current = null;
        }
        recordTimeoutRef.current = setTimeout(() => {
          try {
            rec.stop();
          } catch {}
        }, RECORD_DURATION_MS);
      } catch (err) {
        console.error("No se pudo iniciar la grabación de audio", err);
        setStatusMessage("⚠️ No se pudo acceder al micrófono para grabar.");
      }
    };

    const onRecognitionResult = (event: any) => {
      const result = event.results[0][0].transcript.trim();
      setTranscript(result);
      setStatusMessage("🔄 Procesando voz...");

      const lower = result.toLowerCase();
      if (lower.includes("murphy") && lower.includes("soy parte del hogar")) {
        setStatusMessage(`✅ Frase detectada: "${result}"`);
        setVoiceConfirmed(true);
        if (mediaRecorder && isRecording) {
          try {
            mediaRecorder.stop();
            // Asegurar cierre de pistas para forzar evento onstop en algunos navegadores
            if ((mediaRecorder as any).stream) {
              (mediaRecorder as any).stream
                .getTracks()
                .forEach((t: MediaStreamTrack) => t.stop());
            }
          } catch (err) {
            console.warn(
              "No se pudo detener el MediaRecorder en onresult",
              err
            );
          }
        }
      } else {
        setStatusMessage(
          "❌ No se detectó la frase correcta. Por favor di: 'Murphy soy parte del hogar'."
        );
      }
    };

    const onRecognitionError = () => {
      setStatusMessage("⚠️ Ocurrió un error con el reconocimiento de voz.");
      setIsListening(false);
    };

    const onRecognitionEnd = () => {
      setIsListening(false);
      if (mediaRecorder && isRecording) {
        try {
          mediaRecorder.stop();
          if ((mediaRecorder as any).stream) {
            (mediaRecorder as any).stream
              .getTracks()
              .forEach((t: MediaStreamTrack) => t.stop());
          }
        } catch (err) {
          console.warn("No se pudo detener el MediaRecorder en onend", err);
        }
      }
    };

    if (recognition) {
      recognition.onstart = startRecording;
      recognition.onresult = onRecognitionResult;
      recognition.onerror = onRecognitionError;
      recognition.onend = onRecognitionEnd;
      recognition.start();
    } else {
      startRecording();
    }
  };

  // 📸 Simulación de reconocimiento facial
  const handleFaceDetection = () => {
    setFaceDetected(true);
    setStatusMessage("✅ Rostro detectado correctamente.");
  };

  // 📸 Cambiar rostro del propietario
  const handleChangeFace = () => {
    if (!facePasswordVerified) {
      alert("Primero verifica tu contraseña actual para agregar tu rostro.");
      return;
    }
    setFaceDetected(true);
    setStatusMessage("✅ Rostro actualizado correctamente.");
  };

  // 📤 Subir voz capturada al backend y asociarla al usuario
  // Convierte el Blob (generalmente WebM/Opus) a WAV PCM 16-bit para el backend
  const convertBlobToWav = async (blob: Blob): Promise<Blob> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Usar solo un canal (mono). Si el audio es estéreo, tomar el canal 0
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Codificar a WAV PCM 16-bit
    const encodeWAV = (samples: Float32Array, sampleRate: number) => {
      const numChannels = 1;
      const bytesPerSample = 2; // 16-bit
      const blockAlign = numChannels * bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = samples.length * bytesPerSample;
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      // RIFF header
      const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++)
          view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeString(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, "WAVE");

      // fmt chunk
      writeString(12, "fmt ");
      view.setUint32(16, 16, true); // Subchunk1Size
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, 8 * bytesPerSample, true); // bits per sample

      // data chunk
      writeString(36, "data");
      view.setUint32(40, dataSize, true);

      // Write samples as 16-bit PCM
      let offset = 44;
      for (let i = 0; i < samples.length; i++, offset += 2) {
        // Clamp to [-1, 1] and scale
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }

      return new Blob([view], { type: "audio/wav" });
    };

    const wavBlob = encodeWAV(channelData, sampleRate);
    return wavBlob;
  };

  const handleUploadVoiceToUser = async () => {
    try {
      // Feedback inmediato en UI
      setStatusMessage("🔄 Subiendo voz...");
      console.log("[handleUploadVoiceToUser] inicio", {
        isRecording,
        voiceConfirmed,
        hasBlob: !!voiceBlob,
      });
      // En caso de carrera: si aún se está deteniendo el recorder, espera a que se genere el blob
      const waitForVoiceBlob = (timeoutMs = 5000) =>
        new Promise<Blob | null>((resolve) => {
          const start = Date.now();
          const tick = () => {
            if (voiceBlob) return resolve(voiceBlob);
            if (Date.now() - start >= timeoutMs) return resolve(null);
            setTimeout(tick, 100);
          };
          tick();
        });

      let finalBlob: Blob | null = voiceBlob;
      if (!finalBlob) {
        if (mediaRecorder && isRecording) {
          try {
            // Forzar emisión de datos antes de detener
            if (typeof (mediaRecorder as any).requestData === "function") {
              try {
                (mediaRecorder as any).requestData();
              } catch {}
            }
            mediaRecorder.stop();
            if ((mediaRecorder as any).stream) {
              (mediaRecorder as any).stream
                .getTracks()
                .forEach((t: MediaStreamTrack) => t.stop());
            }
          } catch {}
          finalBlob = await waitForVoiceBlob();
          if (!finalBlob) {
            setIsRecording(false);
            console.warn(
              "[handleUploadVoiceToUser] sin blob tras detener recorder"
            );
            return;
          }
        } else {
          console.warn(
            "[handleUploadVoiceToUser] no hay mediaRecorder/voiceBlob"
          );
          return;
        }
      }
      const userId = user?.user?.id ?? user?.user?.user_id;
      if (!userId) {
        alert("No se pudo obtener tu ID de usuario.");
        console.warn("[handleUploadVoiceToUser] userId missing", user);
        return;
      }
      const form = new FormData();
      form.append("user_id", String(userId));
      // Convertir a WAV para que el backend (preprocess_wav) lo procese correctamente
      const wavBlob = await convertBlobToWav(finalBlob as Blob);
      form.append("audio_file", wavBlob, "voice.wav");

      const tokenResp = await axiosInstance.post(
        "/speaker/speaker/add_voice_to_user",
        form,
        {
          headers: { "Content-Type": undefined },
        }
      );
      // Si el backend devuelve nuevos tokens, actualizarlos para evitar 401 posteriores
      const tokenData = (tokenResp as any)?.data;
      if (tokenData?.access_token) {
        try {
          localStorage.setItem("access_token", tokenData.access_token);
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${tokenData.access_token}`;
        } catch {}
      }
      if (tokenData?.refresh_token) {
        try {
          localStorage.setItem("refresh_token", tokenData.refresh_token);
        } catch {}
      }
      setStatusMessage("✅ Voz registrada y almacenada correctamente.");
      setChangeVoiceModalOpen(false);
      setVoiceConfirmed(false);
      setVoiceBlob(null);
      setIsRecording(false);
      console.log("[handleUploadVoiceToUser] éxito");
    } catch (e: any) {
      const status = e?.response?.status;
      const message =
        e?.response?.data?.detail || e?.message || "Error al subir voz";
      if (status === 409) {
        alert("La voz proporcionada ya está registrada por otro usuario.");
        setStatusMessage("⚠️ La voz ya está registrada por otro usuario.");
        console.warn(
          "[handleUploadVoiceToUser] 409 conflict",
          e?.response?.data
        );
        return;
      }
      console.error("[handleUploadVoiceToUser] error", e);
      alert(message);
    }
  };

  // 🖼️ Registrar rostro en backend para usuario actual (hardware-side captura)
  const handleRegisterFaceToUser = async () => {
    try {
      const userId = user?.user?.id ?? user?.user?.user_id;
      if (!userId) {
        alert("No se pudo obtener tu ID de usuario.");
        return;
      }
      await axiosInstance.post(`/rc/rc/users/${userId}/register_face`, null, {
        params: { num_photos: 5 },
      });
      setStatusMessage("✅ Rostro registrado y almacenado correctamente.");
      setChangeFaceModalOpen(false);
      setFaceDetected(false);
    } catch (e: any) {
      const message =
        e?.response?.data?.detail || e?.message || "Error al registrar rostro";
      alert(message);
    }
  };

  // 🔐 Verificación de contraseña para voz/rostro
  const [voicePassword, setVoicePassword] = useState("");
  const [voicePasswordVerified, setVoicePasswordVerified] = useState(false);
  const [facePassword, setFacePassword] = useState("");
  const [facePasswordVerified, setFacePasswordVerified] = useState(false);

  const handleVerifyVoicePassword = async () => {
    try {
      await axiosInstance.post("/auth/auth/verify-password", {
        current_password: voicePassword,
      });
      setVoicePasswordVerified(true);
      setStatusMessage("🔐 Contraseña verificada. Puedes agregar tu voz.");
    } catch (e: any) {
      setVoicePasswordVerified(false);
      const message =
        e?.response?.data?.detail || e?.message || "Contraseña incorrecta";
      alert(message);
    }
  };

  const handleVerifyFacePassword = async () => {
    try {
      await axiosInstance.post("/auth/auth/verify-password", {
        current_password: facePassword,
      });
      setFacePasswordVerified(true);
      setStatusMessage("🔐 Contraseña verificada. Puedes agregar tu rostro.");
    } catch (e: any) {
      setFacePasswordVerified(false);
      const message =
        e?.response?.data?.detail || e?.message || "Contraseña incorrecta";
      alert(message);
    }
  };

  // 🎯 Finalizar registro
  const handleFinalizeMember = () => {
    // No permitir registro si el usuario actual no es owner
    if (!isCurrentUserOwner) {
      alert("Solo el propietario puede agregar nuevos usuarios.");
      return;
    }

    // Evitar doble envío si ya está en curso
    if (isRegisteringMember) {
      return;
    }
    setIsRegisteringMember(true);

    const run = async () => {
      try {
        // Decidir endpoint según el interruptor de administrador (owner)
        const isOwnerForNewUser = newMember.isAdmin;
        if (isOwnerForNewUser) {
          // Registrar propietario y refrescar lista de propietarios
          await axiosInstance.post("/auth/auth/register-owner", {
            username: newMember.username,
            password: newMember.password,
            is_owner: true,
          });
          await refreshOwners();
        } else {
          // Registrar usuario normal y refrescar miembros desde la BD
          await axiosInstance.post("/auth/auth/register", {
            username: newMember.username,
            password: newMember.password,
          });
          await refreshMembers();
        }
        setIsAddMemberModalOpen(false);
        setStatusMessage("");
        setCurrentStep(1);
        setVoiceConfirmed(false);
        setFaceDetected(false);
        setNewMember({
          username: "",
          password: "",
          confirmPassword: "",
          isAdmin: false,
        });
      } catch (e: any) {
        const message =
          e?.response?.data?.detail ||
          e?.message ||
          "Error al registrar usuario";
        alert(message);
      } finally {
        setIsRegisteringMember(false);
      }
    };

    run();
  };

  return {
    ownerName,
    setOwnerName,
    ownerPassword,
    setOwnerPassword,
    ownerUsernames,
    language,
    setLanguage,
    timezone,
    setTimezone,
    notifications,
    setNotifications,
    members,
    setMembers,

    isProfileModalOpen,
    setIsProfileModalOpen,
    changeVoiceModalOpen,
    setChangeVoiceModalOpen,
    changeFaceModalOpen,
    setChangeFaceModalOpen,
    modalOwnerName,
    setModalOwnerName,
    modalPassword,
    setModalPassword,
    modalTimezone,
    setModalTimezone,
    modalCurrentPassword,
    setModalCurrentPassword,

    isAddMemberModalOpen,
    setIsAddMemberModalOpen,
    isListening,
    // En el objeto de retorno, elimina la duplicidad de isRecording
    // Solo debe aparecer una vez
    isRecording,
    transcript,
    statusMessage,

    // funciones perfil
    handleEditProfile,
    handleSaveProfile,

    // funciones cambiar voz y rostro
    handleChangeVoice,
    handleChangeFace,
    handleUploadVoiceToUser,
    handleRegisterFaceToUser,
    voicePassword,
    setVoicePassword,
    voicePasswordVerified,
    handleVerifyVoicePassword,
    facePassword,
    setFacePassword,
    facePasswordVerified,
    handleVerifyFacePassword,

    // flujo registro
    currentStep,
    setCurrentStep,
    newMember,
    setNewMember,
    errorMessage,
    isRegisteringMember,
    voiceConfirmed,
    faceDetected,
    handleAccountStep,
    handleVoiceRecognitionEnhanced,
    handleFaceDetection,
    handleFinalizeMember,
    // Exponer funciones de refresco por si la UI las necesita
    // (no se usan directamente fuera por ahora)
    // @ts-ignore
    refreshMembers,
    // @ts-ignore
    refreshOwners,
    isCurrentUserOwner,
  };
}
