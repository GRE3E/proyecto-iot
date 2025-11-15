"use client"
import { User, Trash2, Edit, Eye, Power, UserPlus } from "lucide-react"
import { useState, useMemo } from "react"
import Modal from "../UI/Modal"

export interface FamilyMember {
  id: string
  name: string
  role: "Administrador" | "Familiar"
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
  onAddMember?: () => void
  owners?: string[]
}

export default function Perfil({
  name,
  role,
  members,
  setMembers,
  isOwnerFixed = false,
  onEditProfile,
  onAddMember,
  owners = [],
}: PerfilProps) {
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)

  // Separar administradores y familiares
  const admins = useMemo(() => {
    return members.filter(m => m.role === "Administrador")
  }, [members])

  const familiares = useMemo(() => {
    return members.filter(m => m.role === "Familiar")
  }, [members])

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

  const handleRoleChange = () => {
    if (!editingMember) return
    const newRole =
      editingMember.role === "Administrador" ? "Familiar" : "Administrador"
    const newPrivileges =
      newRole === "Administrador"
        ? { controlDevices: true, viewCamera: true }
        : { controlDevices: false, viewCamera: false }

    setEditingMember({
      ...editingMember,
      role: newRole,
      privileges: newPrivileges,
    })
  }

  return (
    <div className="space-y-5 text-white">
      {/* Sección del propietario */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-blue-400" />
          <div>
            <div className="font-semibold">{name}</div>
            <div className="text-xs text-slate-400">
              {isOwnerFixed ? "Propietario" : role}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-3 w-full md:w-auto">
          <button
            onClick={onEditProfile}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-all md:w-44"
          >
            <Edit className="w-4 h-4" /> Editar perfil
          </button>

          {onAddMember && (
            <button
              onClick={onAddMember}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-all md:w-44"
            >
              <UserPlus className="w-4 h-4" /> Agregar familiar
            </button>
          )}
        </div>
      </div>

      {/* Lista de usuarios - Vista Vertical (Administradores arriba, Familiares abajo) */}
      <div className="space-y-6">
       
        {admins.length === 0 && familiares.length === 0 ? (
          <p className="text-slate-400 text-sm">
            No hay usuarios registrados.
          </p>
        ) : (
          <>
            {/* ADMINISTRADORES - ARRIBA */}
            <div className="space-y-3">
              <h4 className="text-red-400 font-semibold text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                Administradores ({(owners?.length || 0) + admins.length})
              </h4>

              {/* Propietarios - Tags dentro de Administradores */}
              {owners && owners.length > 0 && (
                <div className="space-y-3">
                  {owners.map((name) => (
                    <div
                      key={name}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition"
                    >
                      <div>
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-slate-400">
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {admins.length === 0 ? (
                <p className="text-slate-400 text-sm"></p>
              ) : (
                admins.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition"
                  >
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-slate-400">
                      </div>
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

            {/* FAMILIARES - ABAJO */}
            <div className="space-y-3">
              <h4 className="text-blue-400 font-semibold text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Familiares ({familiares.length})
              </h4>
              
              {familiares.length === 0 ? (
                <p className="text-slate-400 text-sm">No hay familiares</p>
              ) : (
                familiares.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition"
                  >
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-slate-400">
                      </div>
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
          </>
        )}
      </div>

      {/* Modal*/}
      {editingMember && (
        <Modal
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          title={`Editar: ${editingMember.name}`}
          className="border border-slate-700/50"
        >
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
              <label className="block text-sm text-slate-400 mb-2">
                Privilegios
              </label>
              <div className="space-y-3">
                {/* Administrador */}
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2">
                    <Power className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Administrador</span>
                  </div>
                  <button
                    onClick={handleRoleChange}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      editingMember.role === "Administrador"
                        ? "bg-red-600"
                        : "bg-blue-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        editingMember.role === "Administrador"
                          ? "translate-x-7"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Controlar dispositivos */}
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2">
                    <Power className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Controlar dispositivos</span>
                  </div>
                  <button
                    onClick={() =>
                      setEditingMember({
                        ...editingMember,
                        privileges: {
                          ...editingMember.privileges,
                          controlDevices: !editingMember.privileges
                            .controlDevices,
                        },
                      })
                    }
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      editingMember.privileges.controlDevices
                        ? "bg-blue-600"
                        : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        editingMember.privileges.controlDevices
                          ? "translate-x-7"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Ver cámaras */}
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Ver cámaras</span>
                  </div>
                  <button
                    onClick={() =>
                      setEditingMember({
                        ...editingMember,
                        privileges: {
                          ...editingMember.privileges,
                          viewCamera: !editingMember.privileges.viewCamera,
                        },
                      })
                    }
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      editingMember.privileges.viewCamera
                        ? "bg-blue-600"
                        : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        editingMember.privileges.viewCamera
                          ? "translate-x-7"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="mt-6 flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-3">
            <button
              onClick={() => setEditingMember(null)}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm w-full md:w-auto"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm w-full md:w-auto"
            >
              Guardar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}