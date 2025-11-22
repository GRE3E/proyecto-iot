// PageHeader.tsx
"use client"
import type { ReactNode } from "react"
import { useEffect, isValidElement, cloneElement } from "react"
import { useThemeByTime } from "../../hooks/useThemeByTime"
import ProfileNotifications from "./ProfileNotifications"

interface PageHeaderProps {
  title: string
  icon: ReactNode
}

export default function PageHeader({
  title,
  icon,
}: PageHeaderProps) {
  const { colors } = useThemeByTime()
  const themedIcon = isValidElement(icon)
    ? cloneElement(icon as any, {
        className: [
          (icon as any)?.props?.className?.replace(/\btext-[^\s]+\b/g, ""),
          colors.icon,
        ]
          .filter(Boolean)
          .join(" "),
      })
    : <span className={colors.icon}>{icon}</span>
  // Header fijo en mobile: sin desplazamiento
  useEffect(() => {
    // Asegura que el body tenga suficiente padding-top si fuese necesario
    // (la página ya maneja sus paddings; aquí no forzamos nada)
    return () => {}
  }, [])

  return (
    <>    
    <div
      className={`fixed md:relative top-0 left-0 right-0 z-50 transition-transform duration-200 ease-out backdrop-blur-sm border-b md:bg-transparent md:border-0 md:backdrop-blur-0`}
      style={{
        transform: "translateY(0px)",
      }}
    >
      <div className={`${colors.headerBg} md:bg-transparent md:border-0`}></div>
      {/* MOBILE LAYOUT */}
      <div className="md:hidden flex items-center justify-between gap-3 h-17 px-5 pt-1 pb-2 md:pt-0 relative">
        {/* IZQUIERDA: Espacio para hamburguesa (vacío, se controla desde Sidebar) */}
        <div className="w-12 h-12 flex-shrink-0" />

        {/* CENTRO: ICONO + TITULO */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-xl backdrop-blur-sm border ${colors.cardBg} flex-shrink-0`}>
            {themedIcon}
          </div>
          <h2 className={`text-2xl font-bold tracking-tight truncate ${colors.title}`}>
            {title}
          </h2>
        </div>

        {/* DERECHA: Perfil + Notificaciones */}
        <div className="flex-shrink-0 pr-2">
          <ProfileNotifications />
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex flex-row items-start md:items-center justify-between gap-4 -mt-2 relative">
        <div className="flex items-center gap-4 -mt-7">
          <div className={`p-2 md:p-3 rounded-xl backdrop-blur-sm border ${colors.cardBg}`}>
            {themedIcon}
          </div>
          <h2 className={`text-3xl md:text-4xl font-bold tracking-tight md:translate-y-[-4px] ${colors.title}`}>
            {title}
          </h2>
        </div>

        {/* DERECHA: Perfil + Notificaciones */}
        <ProfileNotifications />
      </div>
    </div>
    {/* Separador bajo el header en móvil para no pegar el contenido */}
    <div className="md:hidden h-2"/>
    </>
  )
}