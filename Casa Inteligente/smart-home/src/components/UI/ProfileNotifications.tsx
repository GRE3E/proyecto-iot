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
  const { notifications } = useNotifications(initialNotifications)

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

      {/* Notificaciones */}
      <div className="relative">
        <Bell className="w-6 h-6 text-white cursor-pointer hover:text-cyan-400 transition-colors duration-200" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
          {notifications.length}
        </span>
      </div>
    </div>
  )
}