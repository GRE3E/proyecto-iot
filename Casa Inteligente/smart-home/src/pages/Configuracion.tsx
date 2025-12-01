"use client";

import { Settings, Bell, Mic, Sun, Moon } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { axiosInstance } from "../services/authService";
import SimpleCard from "../components/UI/Card";
import Perfil from "../components/UI/Perfil";
import Modal from "../components/UI/Modal";
import PageHeader from "../components/UI/PageHeader";
import LocationSelector from "../components/UI/LocationSelector";
import { useConfiguracion } from "../hooks/useConfiguration";
import { useLocation } from "../hooks/useLocation";
import { useThemeByTime } from "../hooks/useThemeByTime";
import { useAuth } from "../hooks/useAuth";

export default function Configuracion() {
  const { colors, theme, setTheme } = useThemeByTime();
  const {
    ownerName,
    setOwnerName,
    notifications,
    setNotifications,
    members,
    setMembers,
    isAddMemberModalOpen,
    setIsAddMemberModalOpen,
    isProfileModalOpen,
    setIsProfileModalOpen,
    modalOwnerName,
    setModalOwnerName,
    modalPassword,
    setModalPassword,
    modalCurrentPassword,
    setModalCurrentPassword,
    isListening,
    transcript,
    statusMessage,
    handleEditProfile,
    handleSaveProfile,
    currentStep,
    setCurrentStep,
    newMember,
    setNewMember,
    errorMessage,
    voiceConfirmed,
    faceDetected,
    isRegisteringMember,
    handleFinalizeMember,
    changeVoiceModalOpen,
    setChangeVoiceModalOpen,
    changeFaceModalOpen,
    setChangeFaceModalOpen,
    handleChangeVoice,
    handleFaceDetection,
    handleUploadVoiceToUser,
    voicePassword,
    setVoicePassword,
    voicePasswordVerified,
    handleVerifyVoicePassword,
    facePassword,
    setFacePassword,
    facePasswordVerified,
    handleVerifyFacePassword,
    isCurrentUserOwner,
    ownerUsernames,
  } = useConfiguracion();

  const { handleLocationChange } = useLocation();
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<Blob[]>([]);
  const [isUploadingFace, setIsUploadingFace] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const stop = () => {
      try {
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
      } catch {}
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    const tryGet = async (constraints: MediaStreamConstraints) => {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        return null;
      }
    };
    const start = async () => {
      try {
        stop();
        let s = await tryGet({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (!s)
          s = await tryGet({
            video: { width: 640, height: 480, facingMode: "environment" },
          });
        if (!s) s = await tryGet({ video: true });
        if (!s) return;
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          try {
            (videoRef.current as any).muted = true;
            (videoRef.current as any).playsInline = true;
            (videoRef.current as any).autoplay = true;
          } catch {}
          try {
            await videoRef.current.play();
          } catch {}
        }
      } catch {}
    };
    if (changeFaceModalOpen && facePasswordVerified) start();
    return () => {
      stop();
      setCapturedPhotos([]);
    };
  }, [changeFaceModalOpen, facePasswordVerified]);

  const handleTakePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (capturedPhotos.length >= 5) return;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedPhotos((prev) => {
            const next = [...prev, blob];
            if (next.length === 1) handleFaceDetection();
            return next;
          });
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleUploadClientFaces = async () => {
    try {
      setIsUploadingFace(true);
      const userId = (user as any)?.user?.id ?? (user as any)?.user?.user_id;
      if (!userId) {
        alert("No se pudo obtener tu ID de usuario.");
        return;
      }
      if (capturedPhotos.length === 0) {
        alert("Toma al menos una foto de tu rostro.");
        return;
      }
      const fd = new FormData();
      capturedPhotos.forEach((blob, idx) =>
        fd.append("files", blob, `face_${idx}.jpg`)
      );
      await axiosInstance.post(`/rc/rc/users/${userId}/upload_faces`, fd, {
        headers: { "Content-Type": undefined },
      });
      setChangeFaceModalOpen(false);
      setCapturedPhotos([]);
      setIsUploadingFace(false);
    } catch (e: any) {
      const message =
        e?.response?.data?.detail || e?.message || "Error al registrar rostro";
      alert(message);
    } finally {
      setIsUploadingFace(false);
    }
  };

  return (
    <div
      className={`p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter w-full ${colors.background} ${colors.text}`}
    >
      <PageHeader
        title="CONFIGURACIÓN"
        icon={<Settings className="w-8 md:w-10 h-8 md:h-10 text-white" />}
      />

      <div className="space-y-6">
        {/* Tema del sistema */}
        <SimpleCard
          className={`p-4 flex items-center justify-between ${colors.cardBg}`}
        >
          <div>
            <div
              className={`${colors.text} flex items-center gap-2 font-medium text-sm`}
            >
              {theme === "light" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}{" "}
              Tema
            </div>
            <div className={`text-xs ${colors.mutedText}`}>
              Elige claro u oscuro
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme("light")}
              className={`p-2 rounded-lg transition-all ${
                theme === "light"
                  ? `bg-gradient-to-r ${colors.primary} text-white`
                  : `${colors.cardBg} ${colors.text} border ${colors.border}`
              }`}
              aria-label="Tema claro"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`p-2 rounded-lg transition-all ${
                theme === "dark"
                  ? `bg-gradient-to-r ${colors.primary} text-white`
                  : `${colors.cardBg} ${colors.text} border ${colors.border}`
              }`}
              aria-label="Tema oscuro"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </SimpleCard>

        {/* Perfil del propietario */}
        <SimpleCard
          className={`p-6 ring-1 ring-slate-700/30 shadow-lg flex flex-col gap-4 ${colors.cardBg}`}
        >
          <Perfil
            name={ownerName}
            setName={setOwnerName}
            role={isCurrentUserOwner ? "Propietario" : "Familiar"}
            members={members}
            setMembers={setMembers}
            isOwnerFixed={false}
            onEditProfile={handleEditProfile}
            onAddMember={
              isCurrentUserOwner
                ? () => setIsAddMemberModalOpen(true)
                : undefined
            }
            owners={ownerUsernames}
          />
        </SimpleCard>

        {/* Preferencias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Notificaciones */}
          <SimpleCard
            className={`p-4 flex items-center justify-between ${colors.cardBg}`}
          >
            <div>
              <div
                className={`${colors.text} flex items-center gap-2 font-medium text-sm`}
              >
                <Bell className="w-4 h-4" /> Notificaciones
              </div>
              <div className={`text-xs ${colors.mutedText}`}>
                Activar o desactivar alertas
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
              className="w-5 h-5 accent-blue-500"
            />
          </SimpleCard>

          {/* Ubicación */}
          <LocationSelector onLocationChange={handleLocationChange} />
        </div>

        {/* Modal editar perfil */}
        <Modal
          title="Editar perfil"
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          backdropClassName="bg-black/60"
          className="!bg-[#0f1420]"
        >
          <div className="space-y-4">
            <div>
              <label className={`block text-sm ${colors.mutedText} mb-1`}>
                Nombre
              </label>
              <input
                type="text"
                value={modalOwnerName}
                onChange={(e) => setModalOwnerName(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-sm ${colors.inputBg} border ${colors.border} ${colors.text}`}
              />
            </div>

            <div>
              <label className={`block text-sm ${colors.mutedText} mb-1`}>
                Contraseña actual
              </label>
              <input
                type="password"
                value={modalCurrentPassword}
                onChange={(e) => setModalCurrentPassword(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-sm ${colors.inputBg} border ${colors.border} ${colors.text}`}
                placeholder="Confirma tu contraseña"
              />
            </div>

            <div>
              <label className={`block text-sm ${colors.mutedText} mb-1`}>
                Nueva contraseña
              </label>
              <input
                type="password"
                value={modalPassword}
                onChange={(e) => setModalPassword(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-sm ${colors.inputBg} border ${colors.border} ${colors.text}`}
                placeholder="Ingresa nueva contraseña (opcional)"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setChangeVoiceModalOpen(true)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all ${colors.buttonActive}`}
              >
                Agregar voz
              </button>
              <button
                onClick={() => setChangeFaceModalOpen(true)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all ${colors.buttonActive}`}
              >
                Agregar rostro
              </button>
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-3 mt-4">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm ${colors.buttonInactive}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                className={`px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white`}
              >
                Guardar
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal agregar voz */}
        <Modal
          title="Agregar reconocimiento de voz"
          isOpen={changeVoiceModalOpen}
          onClose={() => setChangeVoiceModalOpen(false)}
          backdropClassName="bg-black/60"
          className="!bg-[#0f1420]"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-full">
              <label className={`block text-sm ${colors.mutedText} mb-1`}>
                Contraseña actual
              </label>
              <input
                type="password"
                value={voicePassword}
                onChange={(e) => setVoicePassword(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-sm ${colors.inputBg} border ${colors.border} ${colors.text}`}
                placeholder="Confirma tu contraseña"
              />
              <button
                onClick={handleVerifyVoicePassword}
                className={`mt-2 px-4 py-2 rounded-lg text-sm ${colors.buttonActive}`}
              >
                Verificar contraseña
              </button>
              {voicePasswordVerified && (
                <p className="text-green-400 text-xs mt-1">
                  Contraseña verificada ✓
                </p>
              )}
            </div>
            <p className={`text-sm ${colors.mutedText} text-center`}>
              Di la siguiente frase para registrar tu voz:
            </p>
            <p className="text-blue-400 font-semibold text-center text-lg">
              "soy parte del hogar"
            </p>

            <button
              onClick={handleChangeVoice}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-all w-full md:w-auto ${
                isListening
                  ? "bg-red-600 animate-pulse cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={isListening || !voicePasswordVerified}
            >
              <Mic className="w-4 h-4" />
              {isListening ? "Escuchando..." : "Iniciar escucha"}
            </button>

            {statusMessage && (
              <p className={`text-sm ${colors.text} text-center`}>
                {statusMessage}
              </p>
            )}
            {transcript && (
              <p className={`text-sm ${colors.mutedText} text-center italic`}>
                🗣️ Detectado: "{transcript}"
              </p>
            )}

            <div className="flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-3 w-full">
              <button
                onClick={() => setChangeVoiceModalOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm ${colors.buttonInactive}`}
              >
                Cancelar
              </button>
              {voiceConfirmed && (
                <button
                  onClick={() => {
                    handleUploadVoiceToUser();
                  }}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm text-white"
                >
                  Guardar voz
                </button>
              )}
            </div>
          </div>
        </Modal>

        {/* Modal agregar rostro */}
        <Modal
          title="Agregar reconocimiento facial"
          isOpen={changeFaceModalOpen}
          onClose={() => setChangeFaceModalOpen(false)}
          backdropClassName="bg-black/60"
          className="!bg-[#0f1420]"
        >
          <div className="space-y-4 text-center">
            <div className="text-left">
              <label className={`block text-sm ${colors.mutedText} mb-1`}>
                Contraseña actual
              </label>
              <input
                type="password"
                value={facePassword}
                onChange={(e) => setFacePassword(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-sm ${colors.inputBg} border ${colors.border} ${colors.text}`}
                placeholder="Confirma tu contraseña"
              />
              <button
                onClick={handleVerifyFacePassword}
                className={`mt-2 px-4 py-2 rounded-lg text-sm ${colors.buttonActive}`}
              >
                Verificar contraseña
              </button>
              {facePasswordVerified && (
                <p className="text-green-400 text-xs mt-1">
                  Contraseña verificada ✓
                </p>
              )}
            </div>
            <p className={`text-sm ${colors.mutedText}`}>
              Usa la cámara para registrar el reconocimiento de tu rostro.
            </p>

            <div
              className={`rounded-xl w-full h-48 flex items-center justify-center border ${colors.border} ${colors.panelBg}`}
            >
              <video
                ref={videoRef}
                className="w-full h-48 object-cover rounded-xl"
                muted
                playsInline
                autoPlay
              />
            </div>

            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={handleTakePhoto}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm text-white disabled:opacity-50"
                disabled={
                  !facePasswordVerified ||
                  capturedPhotos.length >= 5 ||
                  isUploadingFace
                }
              >
                Tomar foto
              </button>
              <span className={`text-xs ${colors.mutedText}`}>
                Fotos: {capturedPhotos.length}/5
              </span>
            </div>

            {faceDetected && (
              <p className="text-green-400 text-sm font-medium">
                Rostro detectado correctamente ✓
              </p>
            )}

            <div className="flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-3">
              <button
                onClick={() => setChangeFaceModalOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm ${colors.buttonInactive}`}
              >
                Cancelar
              </button>
              {capturedPhotos.length === 5 && (
                <button
                  onClick={handleUploadClientFaces}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm text-white disabled:opacity-50"
                  disabled={isUploadingFace}
                >
                  {isUploadingFace ? "Cargando rostro..." : "Guardar rostro"}
                </button>
              )}
            </div>
          </div>
        </Modal>

        {/* Modal agregar familiar */}
        <Modal
          title="Agregar nuevo familiar"
          isOpen={isAddMemberModalOpen}
          onClose={() => {
            setIsAddMemberModalOpen(false);
            setCurrentStep(1);
          }}
          backdropClassName="bg-black/60"
          className="!bg-[#0f1420]"
        >
          <div className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm ${colors.mutedText} mb-1`}>
                    Nombre de usuario
                  </label>
                  <input
                    type="text"
                    value={newMember.username}
                    onChange={(e) =>
                      setNewMember({ ...newMember, username: e.target.value })
                    }
                    className={`w-full rounded-lg px-3 py-2 text-sm ${colors.inputBg} border ${colors.border} ${colors.text}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm ${colors.mutedText} mb-1`}>
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={newMember.password}
                    onChange={(e) =>
                      setNewMember({ ...newMember, password: e.target.value })
                    }
                    className={`w-full rounded-lg px-3 py-2 text-sm ${colors.inputBg} border ${colors.border} ${colors.text}`}
                  />
                </div>

                <div
                  className={`flex items-center justify-between p-3 rounded-lg border ${colors.border} ${colors.cardBg}`}
                >
                  <label className={`text-sm ${colors.text}`}>
                    ¿Es administrador?
                  </label>
                  <button
                    onClick={() =>
                      setNewMember({
                        ...newMember,
                        isAdmin: !newMember.isAdmin,
                      })
                    }
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      newMember.isAdmin ? "bg-blue-600" : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        newMember.isAdmin ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {errorMessage && (
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleFinalizeMember}
                    disabled={isRegisteringMember}
                    className={`px-4 py-2 rounded-lg text-sm w-full md:w-auto transition-all ${
                      isRegisteringMember
                        ? `${colors.buttonInactive} cursor-not-allowed`
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {isRegisteringMember
                      ? "Registrando..."
                      : "Registrar usuario"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}
