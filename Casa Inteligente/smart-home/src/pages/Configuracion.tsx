"use client"

import { Settings, Globe, Bell, Mic } from "lucide-react"
import SimpleCard from "../components/UI/Card"
import Perfil from "../components/UI/Perfil"
import Modal from "../components/UI/Modal"
import { useConfiguracion } from "../hooks/useConfiguration"

export default function Configuracion() {
  const {
    ownerName,
    setOwnerName,
    language,
    setLanguage,
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
    modalLanguage,
    setModalLanguage,
    modalTimezone,
    setModalTimezone,
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
    handleAccountStep,
    handleVoiceRecognitionEnhanced,
    handleFaceDetection,
    handleFinalizeMember,
  } = useConfiguracion()

  return (
    <div className="font-inter max-w-5xl mx-auto space-y-6 relative">
      <h2 className="text-3xl font-bold text-white flex items-center gap-2">
        <Settings className="w-6 h-6" /> Configuración
      </h2>

      {/* Perfil del propietario con ambos botones */}
      <SimpleCard className="p-6 ring-1 ring-slate-700/30 shadow-lg flex flex-col gap-4">
        <Perfil
          name={ownerName}
          setName={setOwnerName}
          role="Propietario"
          members={members}
          setMembers={setMembers}
          isOwnerFixed={true}
          onEditProfile={handleEditProfile}
          onAddMember={() => setIsAddMemberModalOpen(true)}
        />
      </SimpleCard>

      {/* Preferencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SimpleCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-white flex items-center gap-2 font-medium text-sm">
              <Globe className="w-4 h-4" /> Idioma
            </div>
            <div className="text-xs text-slate-400">Idioma de la aplicación</div>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-800 text-white rounded px-2 py-1 text-sm"
          >
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </select>
        </SimpleCard>

        <SimpleCard className="p-4 flex items-center justify-between">
          <div>
            <div className="text-white flex items-center gap-2 font-medium text-sm">
              <Bell className="w-4 h-4" /> Notificaciones
            </div>
            <div className="text-xs text-slate-400">Activar o desactivar alertas</div>
          </div>
          <input
            type="checkbox"
            checked={notifications}
            onChange={() => setNotifications(!notifications)}
            className="w-5 h-5 accent-blue-500"
          />
        </SimpleCard>
      </div>

      {/* Modal editar perfil */}
      <Modal
        title="Editar perfil"
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nombre</label>
            <input
              type="text"
              value={modalOwnerName}
              onChange={(e) => setModalOwnerName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Idioma</label>
            <select
              value={modalLanguage}
              onChange={(e) => setModalLanguage(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="es">Español</option>
              <option value="en">Inglés</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Zona horaria</label>
            <input
              type="text"
              value={modalTimezone}
              onChange={(e) => setModalTimezone(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveProfile}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Guardar
            </button>
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
          {/* Paso 1: Registro */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre de usuario</label>
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
                <label className="block text-sm text-slate-400 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={newMember.password}
                  onChange={(e) =>
                    setNewMember({ ...newMember, password: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Confirmar contraseña</label>
                <input
                  type="password"
                  value={newMember.confirmPassword}
                  onChange={(e) =>
                    setNewMember({ ...newMember, confirmPassword: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              {errorMessage && <p className="text-red-400 text-sm">{errorMessage}</p>}

              <div className="flex justify-end">
                <button
                  onClick={handleAccountStep}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
                >
                  Registrar usuario
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Voz */}
          {currentStep === 2 && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-slate-400 text-center">
                Di la siguiente frase para registrar tu voz:
              </p>
              <p className="text-blue-400 font-semibold text-center text-lg">
                “Murphy soy parte del hogar”
              </p>

              <button
                onClick={handleVoiceRecognitionEnhanced}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-all ${
                  isListening ? "bg-red-600 animate-pulse cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={isListening}
              >
                <Mic className="w-4 h-4" />
                {isListening ? "Escuchando..." : "Iniciar escucha"}
              </button>

              {statusMessage && (
                <p className="text-sm text-slate-300 text-center">{statusMessage}</p>
              )}
              {transcript && (
                <p className="text-sm text-slate-400 text-center italic">
                  🗣️ Detectado: "{transcript}"
                </p>
              )}

              {voiceConfirmed && (
                <div className="flex justify-end w-full">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
                  >
                    Continuar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Paso 3: Rostro */}
          {currentStep === 3 && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-400">
                Usa la cámara para registrar el rostro del nuevo familiar.
              </p>

              <div className="bg-slate-800 border border-slate-700 rounded-xl w-full h-48 flex items-center justify-center">
                <span className="text-slate-500 text-sm">📷 Vista previa de cámara</span>
              </div>

              {!faceDetected && (
                <button
                  onClick={handleFaceDetection}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
                >
                  Escanear rostro
                </button>
              )}

              {faceDetected && (
                <p className="text-green-400 text-sm font-medium">
                  Rostro detectado correctamente ✅
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
                >
                  Cancelar
                </button>
                {faceDetected && (
                  <button
                    onClick={handleFinalizeMember}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm"
                  >
                    Finalizar registro
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
