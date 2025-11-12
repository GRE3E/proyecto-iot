// PageHeader.tsx
"use client"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import ProfileNotifications from "./ProfileNotifications"

interface PageHeaderProps {
  title: string
  icon: ReactNode
}

export default function PageHeader({
  title,
  icon,
}: PageHeaderProps) {
  const [headerTranslate, setHeaderTranslate] = useState(0)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const difference = currentScrollY - lastScrollY

      // Solo en mobile (md:hidden)
      if (window.innerWidth < 768) {
        // Si scrollea hacia abajo, baja el header
        if (difference > 0) {
          setHeaderTranslate((prev) => Math.min(prev + difference, 100))
        } else {
          // Si scrollea hacia arriba, sube el header
          setHeaderTranslate((prev) => Math.max(prev + difference, 0))
        }
      } else {
        // En desktop, siempre visible
        setHeaderTranslate(0)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  return (
    <div
      className="md:relative transition-transform duration-200 ease-out"
      style={{
        transform: window.innerWidth < 768 ? `translateY(${headerTranslate}px)` : "translateY(0px)",
      }}
    >
      {/* MOBILE LAYOUT */}
      <div className="md:hidden flex items-center justify-between gap-3 -mt-8 py-2 relative">
        {/* IZQUIERDA: Espacio para hamburguesa (vacío, se controla desde Sidebar) */}
        <div className="w-11 h-11 flex-shrink-0" />

        {/* CENTRO: ICONO + TITULO */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/20 flex-shrink-0">
            {icon}
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent tracking-tight truncate">
            {title}
          </h2>
        </div>

        {/* DERECHA: Perfil + Notificaciones */}
        <div className="flex-shrink-0 -mt-1">
          <ProfileNotifications />
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex flex-row items-start md:items-center justify-between gap-4 -mt-2 relative">
        <div className="flex items-center gap-4 -mt-7">
          <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/20">
            {icon}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent tracking-tight md:translate-y-[-4px]">
            {title}
          </h2>
        </div>

        {/* DERECHA: Perfil + Notificaciones */}
        <ProfileNotifications />
      </div>
    </div>
  )
}