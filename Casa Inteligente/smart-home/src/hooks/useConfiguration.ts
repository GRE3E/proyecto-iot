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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [modalOwnerName, setModalOwnerName] = useState(ownerName);
  const [modalTimezone, setModalTimezone] = useState(timezone);
  const [modalLanguage, setModalLanguage] = useState(language);

  // ✏️ Editar perfil
  const handleEditProfile = () => {
    setModalOwnerName(ownerName);
    setModalTimezone(timezone);
    setModalLanguage(language);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = () => {
    if (!modalOwnerName.trim()) {
      alert("El nombre no puede quedar vacío.");
      return;
    }
    setOwnerName(modalOwnerName.trim());
    setLanguage(modalLanguage);
    setTimezone(modalTimezone);
    setIsProfileModalOpen(false);
  };

  // 🎙 Reconocimiento de voz
  const handleVoiceRecognition = () => {
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
      setStatusMessage("🎙️ Escuchando... di 'Okay Murphy' seguido del nombre del familiar.");
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript.trim();
      setTranscript(result);
      setStatusMessage("🔎 Procesando comando...");

      const lower = result.toLowerCase();
      if (lower.startsWith("okay murphy")) {
        const nombre = result.replace(/okay murphy/i, "").trim();
        if (!nombre) {
          setStatusMessage("⚠️ No detecté un nombre después de 'Okay Murphy'. Intenta de nuevo.");
          return;
        }

        const nuevo: FamilyMember = {
          id: Date.now().toString(),
          name: nombre.charAt(0).toUpperCase() + nombre.slice(1),
          role: "Familiar",
          privileges: { controlDevices: false, viewCamera: false },
        };

        setMembers((prev) => [...prev, nuevo]);
        setStatusMessage(`✅ Familiar "${nombre}" agregado correctamente.`);
        setTimeout(() => {
          setIsAddMemberModalOpen(false);
          setStatusMessage("");
        }, 2000);
      } else {
        setStatusMessage("❌ Debes decir 'Okay Murphy' para activar el registro.");
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

  return {
    ownerName,
    setOwnerName,
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
    modalOwnerName,
    setModalOwnerName,
    modalTimezone,
    setModalTimezone,
    modalLanguage,
    setModalLanguage,

    isAddMemberModalOpen,
    setIsAddMemberModalOpen,
    isListening,
    transcript,
    statusMessage,

    handleEditProfile,
    handleSaveProfile,
    handleVoiceRecognition,
  };
}
