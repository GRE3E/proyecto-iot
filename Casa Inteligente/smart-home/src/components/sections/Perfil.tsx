"use client"

import { useState, useEffect } from "react"

interface FamilyMember {
  id: string
  name: string
  role: "Propietario" | "Familiar"
  privileges: { controlDevices: boolean; viewCamera: boolean }
}

export default function Perfil({
  defaultName = "Usuario",
  defaultRole = "Propietario",
  family = [],
  compact = false,
  members: membersProp,
  onMembersChange,
  nameProp,
  onNameChange,
  roleProp,
  onRoleChange,
}: {
  defaultName?: string
  defaultRole?: string
  family?: FamilyMember[]
  compact?: boolean
  members?: FamilyMember[]
  onMembersChange?: (m: FamilyMember[]) => void
  nameProp?: string
  onNameChange?: (s: string) => void
  roleProp?: "Propietario" | "Familiar"
  onRoleChange?: (r: "Propietario" | "Familiar") => void
  fullWidth?: boolean
}) {
  const [name, setName] = useState(nameProp ?? defaultName)
  const [role, setRole] = useState<"Propietario" | "Familiar">(roleProp ?? (defaultRole as "Propietario" | "Familiar"))
  const full = (arguments[0] as any)?.fullWidth ?? false
  const [tz, setTz] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")
  // allow parent to control members via props (Configuracion will pass members + callback)
  const [members, setMembers] = useState<FamilyMember[]>(
    (family && family.length)
      ? family
      : [
          { id: "1", name: "María", role: "Familiar", privileges: { controlDevices: true, viewCamera: true } },
          { id: "2", name: "Carlos", role: "Familiar", privileges: { controlDevices: false, viewCamera: true } },
        ]
  )

  useEffect(() => {
    // try to keep tz up-to-date if environment changes (minimal)
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (detected) setTz(detected)
    } catch (e) {
      // noop
    }
  }, [])

  // sync name/role when parent provides controlled values
  useEffect(() => {
    if (typeof nameProp === "string" && nameProp !== name) setName(nameProp)
  }, [nameProp])

  useEffect(() => {
    if (roleProp && roleProp !== role) setRole(roleProp)
  }, [roleProp])

  const togglePrivilege = (id: string, key: keyof FamilyMember["privileges"]) => {
    setMembers((m) => {
      const next = m.map((mem) => (mem.id === id ? { ...mem, privileges: { ...mem.privileges, [key]: !mem.privileges[key] } } : mem))
      // notify parent if provided
      if (typeof onMembersChange === "function") {
        try { onMembersChange(next) } catch (e) {}
      }
      return next
    })
  }

  // if parent passes members prop, keep local in sync
  useEffect(() => {
    if (membersProp && Array.isArray(membersProp)) setMembers(membersProp)
  }, [membersProp])


  if (compact) {
    // compact view: avatar + owner name (used in Inicio header)
    return (
      <div className="ml-auto flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 grid place-items-center text-white font-bold shadow-lg ring-1 ring-white/10">{name.split(" ")[0].slice(0,2).toUpperCase()}</div>
        <div className="text-left ml-3 hidden sm:flex flex-col items-start">
          <div className="text-sm text-white font-semibold tracking-tight">{name}</div>
          <div className="text-xs text-slate-400">{role}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${full ? 'w-full' : 'w-full max-w-md'} bg-gradient-to-br from-slate-900/60 to-slate-800/50 p-5 rounded-2xl border border-white/5 shadow-lg`}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 grid place-items-center text-white font-extrabold shadow-2xl ring-1 ring-white/10">{name.split(" ")[0].slice(0,2).toUpperCase()}</div>
        <div className="flex-1">
          <input
            className="w-full bg-transparent text-white text-lg font-semibold outline-none placeholder:text-slate-400"
            value={name}
            onChange={(e) => {
              const v = e.target.value
              if (typeof onNameChange === "function") try { onNameChange(v) } catch (e) {}
              setName(v)
            }}
          />
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <div>{role}</div>
            <div className="text-sm text-white">Zona: {tz}</div>
          </div>
          <div className="mt-2">
            <label className="text-xs text-slate-400 mr-2">Rol</label>
            <select value={role} onChange={(e) => {
              const r = e.target.value as "Propietario" | "Familiar"
              setRole(r)
              if (typeof onRoleChange === "function") try { onRoleChange(r) } catch (e) {}
            }} className="bg-black/20 text-white text-sm rounded px-2 py-1">
              <option value="Propietario">Propietario</option>
              <option value="Familiar">Familiar</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm text-slate-300 font-bold mb-2">Miembros de la familia</h4>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between bg-slate-800/30 p-2 rounded">
              <div>
                <div className="text-sm text-white">{m.name}</div>
                <div className="text-xs text-slate-400">{m.role}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => togglePrivilege(m.id, "controlDevices")} className={`px-2 py-1 rounded text-xs ${m.privileges.controlDevices ? "bg-green-500 text-white" : "bg-slate-700 text-slate-300"}`}>
                  Dispositivos
                </button>
                <button onClick={() => togglePrivilege(m.id, "viewCamera")} className={`px-2 py-1 rounded text-xs ${m.privileges.viewCamera ? "bg-green-500 text-white" : "bg-slate-700 text-slate-300"}`}>
                  Cámaras
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
