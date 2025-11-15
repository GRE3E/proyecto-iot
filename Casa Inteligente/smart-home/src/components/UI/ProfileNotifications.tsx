import { Bell } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import { useNotifications } from "../../hooks/useNotification"
import { initialNotifications } from "../../utils/notificationsUtils"

interface ProfileNotificationsProps {
  userName?: string
}

export default function ProfileNotifications({ userName }: ProfileNotificationsProps) {
  const { user } = useAuth()
  const displayUserName = user?.user?.username || userName || "Usuario"
  const apiBase = (import.meta as any)?.env?.VITE_API_URL
    || (import.meta as any)?.env?.VITE_BACKEND_URL
    || (typeof window !== "undefined" ? (localStorage.getItem("API_URL") || undefined) : undefined)
    || "https://bytes-attract-moved-marsh.trycloudflare.com"
  const token = (user as any)?.access_token
    || (user as any)?.token
    || (user as any)?.jwt
    || (user as any)?.idToken
    || (typeof window !== "undefined" ? (localStorage.getItem("access_token") || localStorage.getItem("token") || undefined) : undefined)
  const { notifications, open, toggle, remove, clearAll } = useNotifications(initialNotifications, { apiBase, token, limit: 50, offset: 0 })

  const typeBg = (t?: string) => {
    const key = (t || "").toLowerCase()
    if (key.includes("luz")) return "bg-yellow-500"
    if (key.includes("seg")) return "bg-red-500"
    if (key.includes("user")) return "bg-blue-500"
    return "bg-purple-500"
  }

  return (
    <div className="flex items-center gap-3 md:gap-4 -mt-1 md:-mt-7">
      {/* Usuario */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
          {displayUserName.charAt(0).toUpperCase()}
        </div>
        <span className="text-white font-medium hidden md:block">
          {displayUserName}
        </span>
      </div>

      <div className="relative">
        <button type="button" onClick={toggle} className="relative">
          <Bell className="w-6 h-6 text-white cursor-pointer hover:text-cyan-400 transition-colors duration-200" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {notifications.length}
          </span>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-slate-900/95 text-white shadow-xl z-50 backdrop-blur p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Notificaciones</span>
              <button type="button" onClick={clearAll} className="text-xs text-cyan-300 hover:text-cyan-200">Limpiar</button>
            </div>
            {notifications.length === 0 ? (
              <div className="text-sm text-white/70">Sin notificaciones</div>
            ) : (
              <ul className="max-h-64 overflow-auto divide-y divide-white/10">
                {notifications.map((n) => (
                  <li key={n.id} className="flex items-start justify-between gap-3 py-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {n.type && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBg(n.type)} text-white`}>{n.type}</span>}
                      </div>
                      {n.title && <div className="mt-1 text-sm font-semibold">{n.title}</div>}
                      {n.message && <div className="mt-0.5 text-sm text-white/80">{n.message}</div>}
                    </div>
                    <button type="button" onClick={() => remove(n.id)} className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}