// PageHeader.tsx
"use client"
import type { ReactNode } from "react"
import ProfileNotifications from "./ProfileNotifications"

interface PageHeaderProps {
  title: string
  icon: ReactNode
}

export default function PageHeader({
  title,
  icon,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 w-full -mt-1 md:-mt-2">
      {/* MOBILE: Hamburguesa a la IZQUIERDA */}
      <div className="md:hidden h-11 w-11 flex-shrink-0">
        {/* El hamburguesa del Sidebar se mostrará aquí */}
        <div className="w-full h-full" />
      </div>

      {/* ICONO + TITULO (Centro-Izquierda) */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 md:flex-grow">
        <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/20 flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent tracking-tight truncate">
          {title}
        </h2>
      </div>

      {/* DERECHA: Perfil + Notificaciones */}
      <div className="flex-shrink-0">
        <ProfileNotifications />
      </div>
    </div>
  )
}