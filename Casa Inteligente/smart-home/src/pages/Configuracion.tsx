"use client"

import { Settings, Bell, Mic } from "lucide-react"
import SimpleCard from "../components/UI/Card"
import Perfil from "../components/UI/Perfil"
import Modal from "../components/UI/Modal"
import PageHeader from "../components/UI/PageHeader"
import TimezoneSelector from "../components/UI/TimezoneSelector"
import { useConfiguracion } from "../hooks/useConfiguration"
import { useZonaHoraria } from "../hooks/useZonaHoraria"

export default function Configuracion() {
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
    changeVoiceModalOpen,
    setChangeVoiceModalOpen,
    changeFaceModalOpen,
    setChangeFaceModalOpen,
    handleChangeVoice,
    handleChangeFace,
  } = useConfiguracion()

  const {
    selectedTimezone,
    saveTimezone,
    TIMEZONE_DATA,
  } = useZonaHoraria()

  const handleTimezoneChange = (timezoneString: string) => {
    for (const continent of Object.values(TIMEZONE_DATA)) {
      const found = continent.find((tz) => tz.timezone === timezoneString)
      if (found) {
        saveTimezone(found)
        break
      }
    }
  }

  return (
    <div className="p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter w-full">
      {/* Header */}
      <PageHeader
        title="CONFIGURACIÓN"
        icon={<Settings className="w-8 md:w-10 h-8 md:h-10 text-white" />}
      />

      <div className="space-y-6">
        {/* Perfil del propietario */}
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
          {/* Notificaciones */}
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
              <label className="block text-sm text-slate-400 mb-1">Nombre</label>
              <input
                type="text"
                value={modalOwnerName}
                onChange={(e) => setModalOwnerName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Contraseña</label>
              <input
                type="password"
                value={modalPassword}
                onChange={(e) => setModalPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="Ingresa nueva contraseña"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setChangeVoiceModalOpen(true)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
              >
                Cambiar voz
              </button>
              <button
                onClick={() => setChangeFaceModalOpen(true)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
              >
                Cambiar rostro
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

        {/* Modal cambiar voz */}
        <Modal
          title="Cambiar reconocimiento de voz"
          isOpen={changeVoiceModalOpen}
          onClose={() => setChangeVoiceModalOpen(false)}
        >
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-slate-400 text-center">
              Di la siguiente frase para actualizar tu voz:
            </p>
            <p className="text-blue-400 font-semibold text-center text-lg">
              "Murphy soy parte del hogar"
            </p>

            <button
              onClick={handleChangeVoice}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-all w-full md:w-auto ${
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
                    setChangeVoiceModalOpen(false)
                  }}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm w-full md:w-auto"
                >
                  Guardar voz
                </button>
              )}
            </div>
          </div>
        </Modal>

        {/* Modal cambiar rostro */}
        <Modal
          title="Cambiar reconocimiento facial"
          isOpen={changeFaceModalOpen}
          onClose={() => setChangeFaceModalOpen(false)}
        >
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-400">
              Usa la cámara para actualizar el reconocimiento de tu rostro.
            </p>

            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full h-48 flex items-center justify-center">
              <span className="text-slate-500 text-sm">📷 Vista previa de cámara</span>
            </div>

            {!faceDetected && (
              <button
                onClick={handleChangeFace}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm w-full md:w-auto"
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
                    setChangeFaceModalOpen(false)
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
            setIsAddMemberModalOpen(false)
            setCurrentStep(1)
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

                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <label className="text-sm text-slate-300">¿Es administrador?</label>
                  <button
                    onClick={() =>
                      setNewMember({ ...newMember, isAdmin: !newMember.isAdmin })
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

                {errorMessage && <p className="text-red-400 text-sm">{errorMessage}</p>}

                <div className="flex justify-end">
                  <button
                    onClick={handleAccountStep}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm w-full md:w-auto"
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
                  "Murphy soy parte del hogar"
                </p>

                <button
                  onClick={handleVoiceRecognitionEnhanced}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-all w-full md:w-auto ${
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
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm w-full md:w-auto"
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
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm w-full md:w-auto"
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
                    onClick={() => setIsAddMemberModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm w-full md:w-auto"
                  >
                    Cancelar
                  </button>
                  {faceDetected && (
                    <button
                      onClick={handleFinalizeMember}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm w-full md:w-auto"
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
    </div>
  )
}