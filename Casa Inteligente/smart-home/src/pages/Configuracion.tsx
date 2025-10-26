"use client";

import { Settings, Globe, Bell, UserPlus, Mic } from "lucide-react";
import SimpleCard from "../components/UI/Card";
import Perfil from "../components/UI/Perfil";
import Modal from "../components/UI/Modal";
import { useConfiguracion } from "../hooks/useConfiguration";

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
  } = useConfiguracion();

  return (
    <div className="font-inter max-w-5xl mx-auto space-y-6 relative">
      <h2 className="text-3xl font-bold text-white flex items-center gap-2">
        <Settings className="w-6 h-6" /> Configuración
      </h2>

      {/* Perfil del propietario */}
      <SimpleCard className="p-6 ring-1 ring-slate-700/30 shadow-lg">
        <Perfil
          name={ownerName}
          setName={setOwnerName}
          role="Propietario"
          members={members}
          setMembers={setMembers}
          isOwnerFixed={true}
          onEditProfile={handleEditProfile}
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

      {/* Botón agregar familiar */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsAddMemberModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all"
        >
          <UserPlus className="w-4 h-4" /> Agregar familiar
        </button>
      </div>

      {/* Modal editar perfil (usa Modal.tsx) */}
      <Modal
        title="Editar perfil del propietario"
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
            <label className="block text-sm text-slate-400 mb-1">Zona horaria</label>
            <input
              type="text"
              value={modalTimezone}
              onChange={(e) => setModalTimezone(e.target.value)}
              placeholder="Ejemplo: GMT-5"
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

          <div className="mt-6 flex justify-end gap-3">
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

      {/* Modal agregar familiar (usa Modal.tsx) */}
      <Modal
        title="Agregar nuevo familiar"
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
      >
        <p className="text-sm text-slate-400 mb-4">
          Para registrar, di: <span className="text-blue-400 font-semibold">“Okay Murphy [nombre]”</span>.
        </p>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleVoiceRecognition}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-all ${
              isListening ? "bg-red-600 animate-pulse cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={isListening}
          >
            <Mic className="w-4 h-4" />
            {isListening ? "Escuchando..." : "Iniciar escucha"}
          </button>

          {statusMessage && <p className="text-sm text-slate-300 text-center">{statusMessage}</p>}

          {transcript && (
            <p className="text-sm text-slate-400 text-center italic">🗣️ Detectado: "{transcript}"</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
