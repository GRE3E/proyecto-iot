import { Bell, Zap, ShieldAlert, User as UserIcon, X, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../../hooks/useAuth"
import { useNotifications } from "../../hooks/useNotification"
import { useThemeByTime } from "../../hooks/useThemeByTime"
import { initialNotifications } from "../../utils/notificationsUtils"

interface ProfileNotificationsProps {
  userName?: string
}

export default function ProfileNotifications({ userName }: ProfileNotificationsProps) {
  const { user } = useAuth()
  const { colors, theme } = useThemeByTime()
  const displayUserName = user?.user?.username || userName || "Usuario"
  const apiBase = (import.meta as any)?.env?.VITE_API_BASE_URL
    || (import.meta as any)?.env?.VITE_API_URL
    || (import.meta as any)?.env?.VITE_BACKEND_URL
    || (typeof window !== "undefined" ? (localStorage.getItem("API_URL") || undefined) : undefined)
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

  const typeBorder = (t?: string) => {
    const key = (t || "").toLowerCase()
    if (key.includes("luz")) return "border-yellow-500"
    if (key.includes("seg")) return "border-red-500"
    if (key.includes("user")) return "border-blue-500"
    return "border-purple-500"
  }

  const typeIcon = (t?: string) => {
    const key = (t || "").toLowerCase()
    if (key.includes("luz")) return Zap
    if (key.includes("seg")) return ShieldAlert
    if (key.includes("user")) return UserIcon
    return Bell
  }

  const panelBg = theme === "light" ? "bg-white" : "bg-slate-900"
  const chipClass = theme === "light" ? "bg-slate-200 text-slate-900 border border-slate-300" : "bg-slate-800 text-white border border-slate-700"
  const clearBtnClass = theme === "light" ? "inline-flex items-center justify-center p-2 rounded-md bg-slate-200 text-slate-900 hover:bg-slate-300" : "inline-flex items-center justify-center p-2 rounded-md bg-slate-700 text-white hover:bg-slate-600"
  const deleteBtnClass = "inline-flex items-center justify-center p-2 rounded-md bg-red-600 text-white hover:bg-red-700"

  return (
    <div className="flex items-center gap-3 md:gap-4 -mt-1 md:-mt-7">
      {/* Usuario */}
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${theme === "light" ? "bg-slate-300 text-slate-900" : "bg-slate-800 text-white"}`}>
          {displayUserName.charAt(0).toUpperCase()}
        </div>
        <span className={`${colors.text} font-medium hidden md:block`}>
          {displayUserName}
        </span>
      </div>

      <div className="relative">
        <motion.button type="button" onClick={toggle} className="relative"
          whileTap={{ scale: 0.95 }}
          aria-label="Abrir notificaciones"
        >
          <Bell className={`w-6 h-6 ${colors.icon} cursor-pointer hover:text-cyan-400 transition-colors duration-200`} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {notifications.length}
          </span>
        </motion.button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className={`absolute right-0 mt-2 w-[92vw] sm:w-80 rounded-xl border ${colors.border} ${panelBg} ${colors.text} shadow-xl z-50 p-3`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell className={`w-4 h-4 ${colors.icon}`} />
                  <span className="text-sm font-medium">Notificaciones</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${chipClass}`}>{notifications.length}</span>
                </div>
                <button type="button" onClick={clearAll} className={clearBtnClass} aria-label="Limpiar notificaciones">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className={`text-sm ${colors.mutedText}`}>Sin notificaciones</div>
              ) : (
                <ul className="max-h-64 overflow-auto space-y-2">
                  {notifications.map((n) => {
                    const Icon = typeIcon(n.type)
                    return (
                      <motion.li key={n.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={`group flex items-start justify-between gap-3 p-2 rounded-lg border ${colors.border} hover:shadow-lg transition ${colors.cardBg} ${typeBorder(n.type)} border-l-4`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-700/30">
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          {n.type && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${typeBg(n.type)} text-white`}>{n.type}</span>}
                          {n.title && <div className="mt-1 text-sm font-semibold truncate">{n.title}</div>}
                          {n.message && <div className={`mt-0.5 text-xs ${colors.mutedText} line-clamp-2`}>{n.message}</div>}
                        </div>
                        <div className="flex items-center">
                          <button type="button" onClick={() => remove(n.id)} className={deleteBtnClass} aria-label="Eliminar notificación">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.li>
                    )
                  })}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}