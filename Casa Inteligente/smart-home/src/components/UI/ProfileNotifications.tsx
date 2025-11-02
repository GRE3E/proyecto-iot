"use client";
import { Bell, X } from "lucide-react";
import { useNotifications } from "../../hooks/useNotification";
import { initialNotifications } from "../../utils/notificationsUtils";

interface ProfileNotificationsProps {
  userName?: string;
}

export default function ProfileNotifications({ userName = "Usuario" }: ProfileNotificationsProps) {
  const { notifications, open, closing, remove, clearAll, toggle } = useNotifications(initialNotifications);

  return (
    <div className="flex items-center gap-3 md:gap-4">
      {/* Usuario */}
      <div className="flex md:hidden">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
          {userName[0].toUpperCase()}
        </div>
      </div>
      <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/30 border border-slate-600/20">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
          {userName[0].toUpperCase()}
        </div>
        <span className="text-sm text-slate-200">{userName}</span>
      </div>

      {/* Notificaciones */}
      <div className="relative">
        <button
          onClick={toggle}
          className="relative p-2 md:p-3 rounded-xl bg-slate-800/30 hover:bg-slate-700/40 transition-colors border border-slate-600/20"
        >
          <Bell className="w-5 md:w-6 h-5 md:h-6 text-white" />
          {notifications.length > 0 && (
            <>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              <span className="absolute -bottom-1 -right-1 text-xs font-bold text-red-400">{notifications.length}</span>
            </>
          )}
        </button>

        {open && (
          <div
            className={`absolute mt-3 w-[90vw] max-w-xs sm:w-80 bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/40 p-4 z-50
              left-[-279%] -translate-x-[55%] sm:left-auto sm:translate-x-0 sm:right-0
              ${closing ? "opacity-0 scale-95" : "opacity-100 scale-100"} transition-all duration-300 ease-out max-h-[60vh] overflow-hidden
            `}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-semibold text-slate-200 tracking-wide">Notificaciones</h4>
              <button onClick={clearAll} className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No tienes notificaciones</p>
            ) : (
              <ul className="space-y-3 max-h-48 sm:max-h-64 overflow-y-auto pr-2">
                {notifications.map((n) => (
                  <li key={n.id} className="relative p-3 rounded-lg bg-slate-800/60 border border-slate-700/40 shadow-sm hover:shadow-md transition-all">
                    <p className="text-sm text-slate-200">{n.message}</p>
                    <button onClick={() => remove(n.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
