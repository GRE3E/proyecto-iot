"use client";

import { Settings, Bell, Mic, Sun, Moon } from "lucide-react";
import SimpleCard from "../components/UI/Card";
import Perfil from "../components/UI/Perfil";
import Modal from "../components/UI/Modal";
import PageHeader from "../components/UI/PageHeader";
import TimezoneSelector from "../components/UI/TimezoneSelector";
import { useConfiguracion } from "../hooks/useConfiguration";
import { useZonaHoraria } from "../hooks/useZonaHoraria";
import { useThemeByTime } from "../hooks/useThemeByTime";

export default function Configuracion() {
  const { colors, theme, setTheme, toggleTheme } = useThemeByTime();
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
    isCurrentUserOwner,
    ownerUsernames,
  } = useConfiguracion();

  const { selectedTimezone, saveTimezone, TIMEZONE_DATA } = useZonaHoraria();

  const handleTimezoneChange = (timezoneString: string) => {
    for (const continent of Object.values(TIMEZONE_DATA)) {
      const found = continent.find((tz) => tz.timezone === timezoneString);
      if (found) {
        saveTimezone(found);
        break;
      }
    }
  };

  return (
    <div
      className={`p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter w-full ${colors.background} ${colors.text}`}
    >
      {/* Header */}
      <PageHeader
        title="CONFIGURACIÓN"
        icon={<Settings className="w-8 md:w-10 h-8 md:h-10 text-white" />}
      />

      <div className="space-y-6">
        {/* Tema del sistema */}
        <SimpleCard className="p-4 flex items-center justify-between">
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
              className={`px-3 py-1 rounded-lg text-sm ${
                theme === "light"
                  ? `bg-gradient-to-r ${colors.primary} text-white`
                  : `${colors.cardBg} ${colors.text} border ${colors.cardHover}`
              }`}
            >
              Claro
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`px-3 py-1 rounded-lg text-sm ${
                theme === "dark"
                  ? `bg-gradient-to-r ${colors.primary} text-white`
                  : `${colors.cardBg} ${colors.text} border ${colors.cardHover}`
              }`}
            >
              Oscuro
            </button>
            <button
              onClick={toggleTheme}
              className={`px-3 py-1 rounded-lg text-sm ${colors.cardBg} ${colors.text} border ${colors.cardHover}`}
            >
              Alternar
            </button>
          </div>
        </SimpleCard>
        {/* Perfil del propietario con propietarios arriba y familiares debajo */}
        <SimpleCard className="p-6 ring-1 ring-slate-700/30 shadow-lg flex flex-col gap-4">
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
          <SimpleCard className="p-4 flex items-center justify-between">
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

          {/* Zona horaria - Componente modular */}
          <TimezoneSelector
            selectedTimezone={selectedTimezone}
            onTimezoneChange={handleTimezoneChange}
          />
        </div>

        {/* Modal editar perfil */}
        <Modal
          title="Editar perfil"
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={modalOwnerName}
                onChange={(e) => setModalOwnerName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Contraseña actual
              </label>
              <input
                type="password"
                value={modalCurrentPassword}
                onChange={(e) => setModalCurrentPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="Confirma tu contraseña"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={modalPassword}
                onChange={(e) => setModalPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="Ingresa nueva contraseña (opcional)"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setChangeVoiceModalOpen(true)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
              >
                Agregar voz
              </button>
              <button
                onClick={() => setChangeFaceModalOpen(true)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
              >
                Agregar rostro
              </button>
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-3 mt-4">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm w-full md:w-auto"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm w-full md:w-auto"
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
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-full">
              <label className="block text-sm text-slate-400 mb-1">
                Contraseña actual
              </label>
              <input
                type="password"
                value={voicePassword}
                onChange={(e) => setVoicePassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="Confirma tu contraseña"
              />
              <button
                onClick={handleVerifyVoicePassword}
                className="mt-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
              >
                Verificar contraseña
              </button>
              {voicePasswordVerified && (
                <p className="text-green-400 text-xs mt-1">
                  Contraseña verificada ✔️
                </p>
              )}
            </div>
            <p className="text-sm text-slate-400 text-center">
              Di la siguiente frase para registrar tu voz:
            </p>
            <p className="text-blue-400 font-semibold text-center text-lg">
              "Murphy soy parte del hogar"
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
              <p className="text-sm text-slate-300 text-center">
                {statusMessage}
              </p>
            )}
            {transcript && (
              <p className="text-sm text-slate-400 text-center italic">
                🗣️ Detectado: "{transcript}"
              </p>
            )}

            <div className="flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-3 w-full">
              <button
                onClick={() => setChangeVoiceModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm w-full md:w-auto"
              >
                Cancelar
              </button>
              {voiceConfirmed && (
                <button
                  onClick={() => {
                    handleUploadVoiceToUser();
                  }}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm w-full md:w-auto"
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
        >
          <div className="space-y-4 text-center">
            <div className="text-left">
              <label className="block text-sm text-slate-400 mb-1">
                Contraseña actual
              </label>
              <input
                type="password"
                value={facePassword}
                onChange={(e) => setFacePassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="Confirma tu contraseña"
              />
              <button
                onClick={handleVerifyFacePassword}
                className="mt-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
              >
                Verificar contraseña
              </button>
              {facePasswordVerified && (
                <p className="text-green-400 text-xs mt-1">
                  Contraseña verificada ✔️
                </p>
              )}
            </div>
            <p className="text-sm text-slate-400">
              Usa la cámara para registrar el reconocimiento de tu rostro.
            </p>

            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full h-48 flex items-center justify-center">
              <span className="text-slate-500 text-sm">
                📷 Vista previa de cámara
              </span>
            </div>

            {!faceDetected && (
              <button
                onClick={handleChangeFace}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm w-full md:w-auto"
                disabled={!facePasswordVerified}
              >
                Escanear rostro
              </button>
            )}

            {faceDetected && (
              <p className="text-green-400 text-sm font-medium">
                Rostro detectado correctamente ✅
              </p>
            )}

            <div className="flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-3">
              <button
                onClick={() => setChangeFaceModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm w-full md:w-auto"
              >
                Cancelar
              </button>
              {faceDetected && (
                <button
                  onClick={() => {
                    handleRegisterFaceToUser();
                  }}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm w-full md:w-auto"
                >
                  Guardar rostro
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
        >
          <div className="space-y-6">
            {/* Registro de familiar (solo credenciales y rol) */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Nombre de usuario
                  </label>
                  <input
                    type="text"
                    value={newMember.username}
                    onChange={(e) =>
                      setNewMember({ ...newMember, username: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={newMember.password}
                    onChange={(e) =>
                      setNewMember({ ...newMember, password: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <label className="text-sm text-slate-300">
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
                    className={`px-4 py-2 rounded-lg text-sm w-full md:w-auto ${
                      isRegisteringMember
                        ? "bg-slate-600 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
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
