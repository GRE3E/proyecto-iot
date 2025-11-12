"use client";

import { useState } from "react";
import type { FamilyMember } from "../components/UI/Perfil";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useConfiguracion() {
  const [ownerName, setOwnerName] = useState("Usuario Principal");
  const [ownerPassword, setOwnerPassword] = useState("contraseña123");
  const [language, setLanguage] = useState("es");
  const [timezone, setTimezone] = useState("GMT-5");
  const [notifications, setNotifications] = useState(true);
  const [members, setMembers] = useState<FamilyMember[]>([
    {
      id: "1",
      name: "María",
      role: "Familiar",
      privileges: { controlDevices: true, viewCamera: true },
    },
    {
      id: "2",
      name: "Carlos",
      role: "Familiar",
      privileges: { controlDevices: false, viewCamera: true },
    },
  ]);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [changeVoiceModalOpen, setChangeVoiceModalOpen] = useState(false);
  const [changeFaceModalOpen, setChangeFaceModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [modalOwnerName, setModalOwnerName] = useState(ownerName);
  const [modalPassword, setModalPassword] = useState("");
  const [modalTimezone, setModalTimezone] = useState(timezone);

  // ✏️ Editar perfil
  const handleEditProfile = () => {
    setModalOwnerName(ownerName);
    setModalPassword("");
    setModalTimezone(timezone);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = () => {
    if (!modalOwnerName.trim()) {
      alert("El nombre no puede quedar vacío.");
      return;
    }
    setOwnerName(modalOwnerName.trim());
    if (modalPassword.trim()) {
      setOwnerPassword(modalPassword.trim());
    }
    setTimezone(modalTimezone);
    setIsProfileModalOpen(false);
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

  // ✅ Validación de usuario y contraseña
  const handleAccountStep = () => {
    if (!newMember.username || !newMember.password) {
      setErrorMessage("Completa todos los campos.");
      return;
    }
    setErrorMessage("");
    setTimeout(() => {
      setCurrentStep(2);
    }, 400);
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
        "🎙️ Escuchando... Di la frase: 'Murphy soy parte del hogar' para cambiar tu voz."
      );
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript.trim();
      setTranscript(result);
      setStatusMessage("🔄 Procesando voz...");

      const lower = result.toLowerCase();
      if (lower.includes("murphy") && lower.includes("soy parte del hogar")) {
        setStatusMessage(`✅ Voz actualizada correctamente: "${result}"`);
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
    };

    recognition.start();
  };

  // 📸 Simulación de reconocimiento facial
  const handleFaceDetection = () => {
    setFaceDetected(true);
    setStatusMessage("✅ Rostro detectado correctamente.");
  };

  // 📸 Cambiar rostro del propietario
  const handleChangeFace = () => {
    setFaceDetected(true);
    setStatusMessage("✅ Rostro actualizado correctamente.");
  };

  // 🎯 Finalizar registro
  const handleFinalizeMember = () => {
    const nuevoMiembro: FamilyMember = {
      id: Date.now().toString(),
      name: newMember.username,
      role: newMember.isAdmin ? "Administrador" : "Familiar",
      privileges: { 
        controlDevices: newMember.isAdmin, 
        viewCamera: true 
      },
    };

    setMembers((prev) => [...prev, nuevoMiembro]);
    setIsAddMemberModalOpen(false);
    setStatusMessage("");
    setCurrentStep(1);
    setVoiceConfirmed(false);
    setFaceDetected(false);
    setNewMember({ username: "", password: "", confirmPassword: "", isAdmin: false });
  };

  return {
    ownerName,
    setOwnerName,
    ownerPassword,
    setOwnerPassword,
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

    isAddMemberModalOpen,
    setIsAddMemberModalOpen,
    isListening,
    transcript,
    statusMessage,

    // funciones perfil
    handleEditProfile,
    handleSaveProfile,

    // funciones cambiar voz y rostro
    handleChangeVoice,
    handleChangeFace,

    // flujo registro
    currentStep,
    setCurrentStep,
    newMember,
    setNewMember,
    errorMessage,
    voiceConfirmed,
    faceDetected,
    handleAccountStep,
    handleVoiceRecognitionEnhanced,
    handleFaceDetection,
    handleFinalizeMember,
  };
}