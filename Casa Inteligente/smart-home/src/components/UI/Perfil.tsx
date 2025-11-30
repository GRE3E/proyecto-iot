"use client";
import { User, Trash2, Edit, Power, UserPlus } from "lucide-react";
import { useState, useMemo } from "react";
import { useThemeByTime } from "../../hooks/useThemeByTime";
import Modal from "../UI/Modal";
import { axiosInstance } from "../../services/authService";

export interface FamilyMember {
  id: string;
  name: string;
  role: "Administrador" | "Familiar";
  privileges: {
    controlDevices: boolean;
    viewCamera: boolean;
  };
}

interface PerfilProps {
  name: string;
  setName: (value: string) => void;
  role: "Propietario" | "Familiar";
  members: FamilyMember[];
  setMembers: (value: FamilyMember[]) => void;
  isOwnerFixed?: boolean;
  onEditProfile: () => void;
  onAddMember?: () => void;
  owners?: string[];
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
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(
    null
  );
  const [editPassword, setEditPassword] = useState<string>("");
  const { colors } = useThemeByTime();

  // Separar administradores y familiares
  const admins = useMemo(() => {
    return members.filter((m) => m.role === "Administrador");
  }, [members]);

  const familiares = useMemo(() => {
    return members.filter((m) => m.role === "Familiar");
  }, [members]);

  const deleteMember = (id: string) => {
    const target = members.find((m) => m.id === id) || null;
    setMemberToDelete(target);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    try {
      await axiosInstance.delete("/auth/auth/delete-user", {
        data: { username: memberToDelete.name },
      });
      setMembers(members.filter((m) => m.id !== memberToDelete.id));
      setMemberToDelete(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("refreshMembers"));
      }
    } catch (e: any) {
      const message =
        e?.response?.data?.detail || e?.message || "Error al eliminar usuario";
      alert(message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    try {
      const original = members.find((m) => m.id === editingMember.id);
      const usernameForApi = original?.name || editingMember.name;
      const proposedName = (editingMember.name || "").trim();
      const originalNameTrim = (original?.name || "").trim();
      const newUsernamePayload =
        proposedName && proposedName !== originalNameTrim
          ? proposedName
          : undefined;
      await axiosInstance.post("/auth/auth/update-member-role", {
        username: usernameForApi,
        make_owner: editingMember.role === "Administrador",
        new_password: editPassword.trim() || undefined,
        new_username: newUsernamePayload,
      });
      const updatedMembers =
        editingMember.role === "Administrador"
          ? members.filter((m) => m.id !== editingMember.id)
          : members.map((m) => (m.id === editingMember.id ? editingMember : m));
      setMembers(updatedMembers);
      setEditingMember(null);
      setEditPassword("");
      // Solicitar refresco según rol final
      if (typeof window !== "undefined") {
        const demotedOwner =
          editingMember.role !== "Administrador" &&
          editingMember.id.startsWith("owner:");
        if (demotedOwner) {
          window.dispatchEvent(new Event("refreshOwners"));
          window.dispatchEvent(new Event("refreshMembers"));
        } else if (editingMember.role === "Administrador") {
          window.dispatchEvent(new Event("refreshOwners"));
        } else {
          window.dispatchEvent(new Event("refreshMembers"));
        }
      }
    } catch (e: any) {
      const message =
        e?.response?.data?.detail || e?.message || "Error al guardar cambios";
      alert(message);
    }
  };

  const handleRoleChange = () => {
    if (!editingMember) return;
    const newRole =
      editingMember.role === "Administrador" ? "Familiar" : "Administrador";
    const newPrivileges =
      newRole === "Administrador"
        ? { controlDevices: true, viewCamera: true }
        : { controlDevices: false, viewCamera: false };

    setEditingMember({
      ...editingMember,
      role: newRole,
      privileges: newPrivileges,
    });
  };

  return (
    <div className={`space-y-5 ${colors.text}`}>
      {/* Sección del propietario */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-blue-400" />
          <div>
            <div className="font-semibold">{name}</div>
            <div className={`text-xs ${colors.mutedText}`}>
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
        {(owners?.length || 0) + admins.length + familiares.length === 0 ? (
          <p className="text-slate-400 text-sm">No hay usuarios registrados.</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {owners.map((name) => (
                    <div
                      key={name}
                      className={`p-3 rounded-lg border ${colors.cardBg} ${colors.border} ${colors.cardHover} flex items-center gap-3`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800/40 text-white flex items-center justify-center font-bold text-xs">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {admins.length === 0 ? (
                <p className="text-slate-400 text-sm"></p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {admins.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg border ${colors.cardBg} ${colors.border} ${colors.cardHover} flex items-center gap-3`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800/40 text-white flex items-center justify-center font-bold text-xs">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{m.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingMember(m)}
                          className="text-blue-400 hover:text-blue-500 transition"
                          title="Editar miembro"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FAMILIARES - ABAJO */}
            <div className="space-y-3">
              <h4 className="text-blue-400 font-semibold text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Familiares ({familiares.length})
              </h4>

              {familiares.length === 0 ? (
                <p className={`text-sm ${colors.mutedText}`}>
                  No hay familiares
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {familiares.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg border ${colors.cardBg} ${colors.border} ${colors.cardHover} flex items-center gap-3`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800/40 text-white flex items-center justify-center font-bold text-xs">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{m.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingMember(m)}
                          className="text-blue-400 hover:text-blue-500 transition"
                          title="Editar miembro"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {role === "Propietario" && (
                          <button
                            onClick={() => deleteMember(m.id)}
                            className="text-red-400 hover:text-red-600 transition"
                            title="Eliminar miembro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
              <label className={`block text-sm ${colors.mutedText} mb-1`}>
                Nombre
              </label>
              <input
                type="text"
                value={editingMember.name}
                onChange={(e) =>
                  setEditingMember({
                    ...editingMember,
                    name: e.target.value,
                  })
                }
                className={`w-full ${colors.inputBg} border ${colors.inputBorder} rounded-lg px-3 py-2 text-sm ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label className={`block text-sm ${colors.mutedText} mb-1`}>
                Contraseña
              </label>
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className={`w-full ${colors.inputBg} border ${colors.inputBorder} rounded-lg px-3 py-2 text-sm ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label className={`block text-sm ${colors.mutedText} mb-2`}>
                Privilegios
              </label>
              <div className="space-y-3">
                {/* Administrador */}
                <div
                  className={`flex items-center justify-between p-3 ${colors.inputBg} rounded-lg border ${colors.inputBorder}`}
                >
                  <div className="flex items-center gap-2">
                    <Power className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Administrador</span>
                  </div>
                  <button
                    onClick={handleRoleChange}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      editingMember.role === "Administrador"
                        ? "bg-blue-600"
                        : "bg-red-600"
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

      {memberToDelete && (
        <Modal
          isOpen={!!memberToDelete}
          onClose={() => setMemberToDelete(null)}
          title="Eliminar miembro"
          panelClassName="max-w-sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{memberToDelete.name}</div>
                <div className={`text-sm ${colors.mutedText}`}>
                  Esta acción no se puede deshacer.
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-3">
              <button
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm w-full md:w-auto"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm w-full md:w-auto"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
