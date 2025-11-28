// PageHeader.tsx
"use client"
import type { ReactNode } from "react"
import { useEffect, isValidElement, cloneElement, useState } from "react"
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
  const { colors, theme } = useThemeByTime()
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
  
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      handleResize();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const borderColor = theme === "light" ? "border-slate-200" : "border-slate-700/50"

  return (
    <>    
    <div
      className={`fixed md:relative top-0 left-0 right-0 z-50 transition-transform duration-200 ease-out backdrop-blur-sm border-b md:bg-transparent md:border-0 md:backdrop-blur-0 ${borderColor}`}
      style={{
        transform: "translateY(0px)",
      }}
    >
      <div className={`${colors.headerBg} md:bg-transparent md:border-0`}></div>
      {isMobile && (
        <div className="flex items-center justify-between gap-3 h-17 px-5 pt-1 pb-2 md:pt-0 relative">
          <div className="w-12 h-12 flex-shrink-0" />

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-xl backdrop-blur-sm border ${colors.cardBg} flex-shrink-0`}>
              {themedIcon}
            </div>
            <h2 className={`text-2xl font-bold tracking-tight truncate ${colors.title}`}>
              {title}
            </h2>
          </div>

          <div className="flex-shrink-0 pr-2 pt-2">
            <ProfileNotifications />
          </div>
        </div>
      )}

      {!isMobile && (
        <div className="hidden md:flex flex-row items-start md:items-center justify-between gap-4 -mt-2 relative">
          <div className="flex items-center gap-4 -mt-7">
            <div className={`p-2 md:p-3 rounded-xl backdrop-blur-sm border ${colors.cardBg}`}>
              {themedIcon}
            </div>
            <h2 className={`text-3xl md:text-4xl font-bold tracking-tight md:translate-y-[-4px] ${colors.title}`}>
              {title}
            </h2>
          </div>

          <ProfileNotifications />
        </div>
      )}
    </div>
    <div className="md:hidden h-2"/>
    </>
  )
}