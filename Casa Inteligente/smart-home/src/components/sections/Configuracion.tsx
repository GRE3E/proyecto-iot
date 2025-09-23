"use client"
import { useState, useEffect } from "react"
import SimpleCard from "../UI/SimpleCard"
import SimpleButton from "../UI/SimpleButton"
// Perfil component not used here; this file provides its own polished profile editor

const timezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : (() => {
  // fallback expanded list (common zones) when supportedValuesOf isn't available
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
  return [detected || 'UTC', 'Europe/Madrid', 'America/Mexico_City', 'America/New_York', 'America/Los_Angeles', 'Africa/Cairo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney']
})()

interface Props {
  ownerName: string
  setOwnerName: (v: string) => void
  language: string
  setLanguage: (v: string) => void
  notifications: boolean
  setNotifications: (v: boolean) => void
}

export default function Configuracion({ ownerName, setOwnerName, language, setLanguage }: Props) {
  // UI state
  const [editingProfile, setEditingProfile] = useState(false)

  // profile / prefs local state
  const [localOwnerName, setLocalOwnerName] = useState(ownerName)
  const [localLanguage, setLocalLanguage] = useState(language)
  const [ownerRole, setOwnerRole] = useState<'Propietario' | 'Familiar'>('Propietario')
  const [tz, setTz] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')

  // modal edit fields for Perfil
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<'Propietario' | 'Familiar'>('Propietario')
  const [editLanguage, setEditLanguage] = useState('')

  // member management
  const [members, setMembers] = useState<{ id: string; name: string; role: 'Familiar' | 'Propietario'; privileges: { controlDevices: boolean; viewCamera: boolean } }[]>([
    { id: Date.now().toString(), name: 'María', role: 'Familiar', privileges: { controlDevices: true, viewCamera: true } },
    { id: (Date.now()+1).toString(), name: 'Carlos', role: 'Familiar', privileges: { controlDevices: false, viewCamera: true } },
  ])

  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newControl, setNewControl] = useState(false)
  const [newCamera, setNewCamera] = useState(false)
  const [newRole, setNewRole] = useState<'Familiar' | 'Propietario'>('Familiar')

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (detected) setTz(detected)
    } catch (e) {}
  }, [])

  // hydrate saved config
  useEffect(() => {
    try {
      const raw = localStorage.getItem('smarthome:config')
      if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.ownerName) setLocalOwnerName(parsed.ownerName)
          if (parsed.language) setLocalLanguage(parsed.language)
          if (parsed.timezone) setTz(parsed.timezone)
          if (Array.isArray(parsed.members)) setMembers(parsed.members)
          if (parsed.ownerRole) setOwnerRole(parsed.ownerRole)
        }
    } catch (e) {}
  }, [])

  const toggleMemberPrivilege = (id: string, key: 'controlDevices' | 'viewCamera') => {
    setMembers((m) => m.map((mem) => mem.id === id ? { ...mem, privileges: { ...mem.privileges, [key]: !mem.privileges[key] } } : mem))
  }

  const removeMember = (id: string) => setMembers((m) => m.filter((x) => x.id !== id))

  const saveConfig = () => {
    const payload = { ownerName: localOwnerName, language: localLanguage, timezone: tz, members, ownerRole }
    try {
      localStorage.setItem('smarthome:config', JSON.stringify(payload))
      try { setOwnerName(localOwnerName) } catch (e) {}
      try { setLanguage(localLanguage) } catch (e) {}
      setEditingProfile(false)
    } catch (e) {}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-extrabold text-white">Configuración</h2>
      </div>

      <div className="mb-6">
        <div className="text-sm text-slate-400">Configuración consolidada — Perfil, Miembros y Preferencias en una sola vista.</div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Perfil (display-only) */}
        <SimpleCard className="p-6 ring-1 ring-slate-700/30 shadow-lg">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="w-36 flex flex-col items-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold shadow">{localOwnerName ? localOwnerName.charAt(0).toUpperCase() : 'U'}</div>
              <div className="text-xs text-slate-400 mt-2">Avatar</div>
              <SimpleButton onClick={() => {
                // prepare modal values
                setEditName(localOwnerName)
                setEditRole(ownerRole)
                setEditLanguage(localLanguage)
                setEditingProfile(true)
              }} className="mt-3">Editar perfil</SimpleButton>
            </div>

            <div className="flex-1 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-300 mb-1">Nombre</div>
                  <div className="w-full px-4 py-3 rounded bg-slate-800 border border-slate-700 text-white">{localOwnerName}</div>
                </div>

                <div>
                  <div className="text-sm text-slate-300 mb-1">Rol</div>
                  <div className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white">{ownerRole}</div>
                </div>

                <div>
                  <div className="text-sm text-slate-300 mb-1">Idioma</div>
                  <div className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white">{localLanguage === 'es' ? 'Español' : localLanguage === 'en' ? 'Inglés' : localLanguage}</div>
                </div>

                {/* timezone intentionally removed from profile display */}
              </div>
              <div className="mt-4 text-sm text-slate-400">Consejo: mantén tu perfil actualizado para mejorar la personalización.</div>
            </div>
          </div>
        </SimpleCard>

        {/* Miembros y permisos */}
        <SimpleCard className="p-6 ring-1 ring-slate-700/30 shadow-lg">
          <div className="flex items-center justify-between mb-4 flex-wrap">
            <h3 className="text-lg font-semibold text-white">Miembros y permisos</h3>
            <div className="flex items-center gap-3 mt-4 md:mt-0 flex-wrap justify-center md:justify-end">
              <SimpleButton onClick={() => setShowAddModal(true)}>+ Agregar</SimpleButton>
              <SimpleButton onClick={() => { setMembers([]) }} className="bg-red-600">Eliminar todos</SimpleButton>
            </div>
          </div>

          <div className="grid gap-3">
            {members.map((mem) => (
              <div key={mem.id} className="flex flex-col sm:flex-row items-center justify-between bg-slate-800/20 p-3 rounded-lg">
                <div className="flex items-center gap-3 mb-2 sm:mb-0">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium">{mem.name ? mem.name.charAt(0).toUpperCase() : 'U'}</div>
                  <div>
                    <div className="text-sm text-white font-medium">{mem.name}</div>
                    <div className="text-xs text-slate-400">{mem.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                  <button onClick={() => toggleMemberPrivilege(mem.id, 'controlDevices')} className={`px-3 py-1 rounded-full text-xs transition ${mem.privileges.controlDevices ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300'}`}>Control</button>
                  <button onClick={() => toggleMemberPrivilege(mem.id, 'viewCamera')} className={`px-3 py-1 rounded-full text-xs transition ${mem.privileges.viewCamera ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300'}`}>Cámara</button>
                  <SimpleButton onClick={() => removeMember(mem.id)} className="bg-red-600">Eliminar</SimpleButton>
                </div>
              </div>
            ))}
          </div>
        </SimpleCard>

        {/* Preferencias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SimpleCard className="p-4 ring-1 ring-slate-700/30 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white font-medium">Idioma</div>
                <div className="text-xs text-slate-400">Idioma de la aplicación</div>
              </div>
              <select value={localLanguage} onChange={(e) => setLocalLanguage(e.target.value)} className="bg-slate-800 text-white rounded px-2 py-1">
                <option value="es">Español</option>
                <option value="en">Inglés</option>
              </select>
            </div>
          </SimpleCard>

          <SimpleCard className="p-4 ring-1 ring-slate-700/30 shadow-lg md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white font-medium">Zona horaria</div>
                <div className="text-xs text-slate-400">Selecciona tu zona horaria</div>
              </div>
              <select value={tz} onChange={(e) => setTz(e.target.value)} className="bg-slate-800 text-white rounded px-2 py-1">
                {timezones && timezones.length ? timezones.slice(0,50).map((t) => <option key={t} value={t}>{t}</option>) : <option value={tz}>{tz}</option>}
              </select>
            </div>
          </SimpleCard>
        </div>

        {/* Add member modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddModal(false)} />
            <div className="relative bg-slate-900 rounded-lg p-6 w-full max-w-md z-10">
              <h3 className="text-xl font-bold mb-4">Agregar Familiar</h3>
              <label className="block text-sm text-slate-300 mb-1">Nombre</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-2 rounded bg-black/20 mb-3" />

              <label className="block text-sm text-slate-300 mb-1">Rol</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)} className="w-full px-3 py-2 rounded bg-black/20 mb-3">
                <option value="Familiar">Familiar</option>
                <option value="Propietario">Propietario</option>
              </select>

              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={newControl} onChange={(e) => setNewControl(e.target.checked)} /> Control de dispositivos</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={newCamera} onChange={(e) => setNewCamera(e.target.checked)} /> Ver cámara</label>
              </div>

              <div className="flex justify-end gap-3">
                <SimpleButton onClick={() => setShowAddModal(false)} className="bg-gray-700">Cancelar</SimpleButton>
                <SimpleButton onClick={() => {
                  if (!newName) return
                  const next = [...members, { id: Date.now().toString(), name: newName, role: newRole, privileges: { controlDevices: newControl, viewCamera: newCamera } }]
                  setMembers(next)
                  setNewName('')
                  setNewControl(false)
                  setNewCamera(false)
                  setNewRole('Familiar')
                  setShowAddModal(false)
                }}>Agregar</SimpleButton>
              </div>
            </div>
          </div>
        )}

        {/* Edit profile modal */}
        {editingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setEditingProfile(false)} />
            <div className="relative bg-slate-900 rounded-lg p-6 w-full max-w-md z-10">
              <h3 className="text-xl font-bold mb-4">Editar perfil</h3>

              <label className="block text-sm text-slate-300 mb-1">Nombre</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded bg-black/20 mb-3" />

              <label className="block text-sm text-slate-300 mb-1">Rol</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value as any)} className="w-full px-3 py-2 rounded bg-black/20 mb-3">
                <option value="Propietario">Propietario</option>
                <option value="Familiar">Familiar</option>
              </select>

              <label className="block text-sm text-slate-300 mb-1">Idioma</label>
              <select value={editLanguage} onChange={(e) => setEditLanguage(e.target.value)} className="w-full px-3 py-2 rounded bg-black/20 mb-4">
                <option value="es">Español</option>
                <option value="en">Inglés</option>
              </select>

              <div className="flex justify-end gap-3">
                <SimpleButton onClick={() => { setEditingProfile(false) }} className="bg-gray-700">Cancelar</SimpleButton>
                <SimpleButton onClick={() => {
                  // apply edits to local state and persist
                  if (editName) setLocalOwnerName(editName)
                  setOwnerRole(editRole)
                  if (editLanguage) setLocalLanguage(editLanguage)
                  saveConfig()
                }} className="bg-cyan-500 text-white">Guardar cambios</SimpleButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
