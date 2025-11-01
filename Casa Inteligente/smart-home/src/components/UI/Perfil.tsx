"use client"
import { User, Trash2, Edit, Eye, Power, X, UserPlus } from "lucide-react"
import { useState } from "react"

export interface FamilyMember {
  id: string
  name: string
  role: "Propietario" | "Familiar"
  privileges: {
    controlDevices: boolean
    viewCamera: boolean
  }
}

interface PerfilProps {
  name: string
  setName: (value: string) => void
  role: "Propietario" | "Familiar"
  members: FamilyMember[]
  setMembers: (value: FamilyMember[]) => void
  isOwnerFixed?: boolean
  onEditProfile: () => void
  onAddMember?: () => void // callback opcional para el botón de agregar familiar
}

export default function Perfil({
  name,
  role,
  members,
  setMembers,
  isOwnerFixed = false,
  onEditProfile,
  onAddMember,
}: PerfilProps) {
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)

  const deleteMember = (id: string) => {
    if (confirm("¿Seguro que deseas eliminar este miembro?")) {
      setMembers(members.filter((m) => m.id !== id))
    }
  }

  const handleSaveEdit = () => {
    if (!editingMember) return
    const updatedMembers = members.map((m) =>
      m.id === editingMember.id ? editingMember : m
    )
    setMembers(updatedMembers)
    setEditingMember(null)
  }

  return (
    <div className="space-y-5 text-white">
      {/* Sección del propietario */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-blue-400" />
          <div>
            <div className="font-semibold">{name}</div>
            <div className="text-xs text-slate-400">
              {isOwnerFixed ? "Propietario" : role}
            </div>
          </div>
        </div>

        {/* Botones alineados horizontalmente a la derecha */}
        <div className="flex gap-2">
          <button
            onClick={onEditProfile}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg w-44 transition-all"
          >
            <Edit className="w-4 h-4" /> Editar perfil
          </button>

          {onAddMember && (
            <button
              onClick={onAddMember}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg w-44 transition-all"
            >
              <UserPlus className="w-4 h-4" /> Agregar familiar
            </button>
          )}
        </div>
      </div>

      {/* Lista de miembros familiares */}
      <div className="space-y-3">
        {members.length === 0 ? (
          <p className="text-slate-400 text-sm">No hay familiares registrados.</p>
        ) : (
          members.map((m: FamilyMember) => (
            <div
              key={m.id}
              className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded-lg hover:bg-slate-800 transition"
            >
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-slate-400">{m.role}</div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingMember(m)}
                  className="text-blue-400 hover:text-blue-500 transition"
                  title="Editar miembro"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deleteMember(m.id)}
                  className="text-red-400 hover:text-red-600 transition"
                  title="Eliminar miembro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de edición de miembro */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl p-6 w-[90%] max-w-md shadow-xl text-white relative">
            <button
              onClick={() => setEditingMember(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-semibold mb-4">
              Editar: {editingMember.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Privilegios</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editingMember.privileges.controlDevices}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          privileges: {
                            ...editingMember.privileges,
                            controlDevices: e.target.checked,
                          },
                        })
                      }
                      className="accent-blue-500 w-4 h-4"
                    />
                    <Power className="w-4 h-4 text-blue-400" />
                    Controlar dispositivos
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editingMember.privileges.viewCamera}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          privileges: {
                            ...editingMember.privileges,
                            viewCamera: e.target.checked,
                          },
                        })
                      }
                      className="accent-blue-500 w-4 h-4"
                    />
                    <Eye className="w-4 h-4 text-blue-400" />
                    Ver cámaras
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
