// Menú Hamburguesa - Versión con bordes en todos los ítems
import { useEffect, useRef, useState } from "react"
import { Home, LogOut } from "lucide-react"
import { useThemeByTime } from "../../hooks/useThemeByTime"

interface HamburgerMenuProps {
  isSidebarOpen: boolean
  setIsSidebarOpen: (value: boolean) => void
  menuItems: { name: string; icon: any }[]
  selectedMenu: string
  handleMenuSelect: (menu: string) => void
  onLogout: () => void
  colors: any
}

export default function HamburgerMenu({
  isSidebarOpen,
  setIsSidebarOpen,
  menuItems,
  selectedMenu,
  handleMenuSelect,
  onLogout,
  colors,
}: HamburgerMenuProps) {
  const { theme: currentTheme } = useThemeByTime()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [transitionItem, setTransitionItem] = useState<{ name: string; icon: any } | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false)
      }
    }

    if (isSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isSidebarOpen, setIsSidebarOpen])

  const handleSelect = (menu: { name: string; icon: any }) => {
    setTransitionItem(menu)
    setTimeout(() => {
      handleMenuSelect(menu.name)
      setTransitionItem(null)
      setIsSidebarOpen(false)
    }, 800)
  }

  const handleLogout = () => {
    setIsLoggingOut(true)
    setTimeout(() => {
      onLogout()
      setIsLoggingOut(false)
    }, 2100)
  }

  return (
    <>
      {/* Fondo animado de transición */}
      {transitionItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md z-[100] animate-fadeInFast">
          <div className="flex flex-col items-center justify-center animate-popInFast">
            <transitionItem.icon className="w-14 h-14 text-white mb-2 animate-bounceGlowFast" />
            <h2 className="text-xl font-bold text-white">{transitionItem.name}</h2>
          </div>
        </div>
      )}

      {/* ANIMACIÓN DE CIERRE DE SESIÓN - PUERTAS */}
      {isLoggingOut && (
        <div 
          className="fixed inset-0 z-[150] overflow-hidden"
          style={{
            background: currentTheme === "light"
              ? "linear-gradient(180deg, rgba(240,244,250,0.95) 0%, rgba(230,236,245,0.95) 100%)"
              : "linear-gradient(180deg, rgba(8,12,24,0.95) 0%, rgba(6,10,20,0.95) 100%)",
          }}
        >
          {/* ... (el resto de la animación de puertas se mantiene igual) */}
          <div className="absolute inset-0">
            <div className="absolute inset-0" style={{ perspective: "2000px" }}>
              <div className="absolute left-0 top-0 w-1/2 h-full origin-left animate-door-close-left" style={{ transformStyle: "preserve-3d" }}>
                <div className="absolute inset-0 bg-gradient-to-r from-[#071022] via-[#0d1424] to-[#0f1b37] shadow-[inset_-60px_0_120px_rgba(0,120,255,0.12)]" />
                <div className="absolute right-[6%] top-1/2 -translate-y-1/2 w-[10px] h-[60px] rounded-full bg-gradient-to-b from-gray-200 to-gray-500" />
              </div>
              <div className="absolute right-0 top-0 w-1/2 h-full origin-right animate-door-close-right" style={{ transformStyle: "preserve-3d" }}>
                <div className="absolute inset-0 bg-gradient-to-l from-[#071022] via-[#0d1424] to-[#0f1b37] shadow-[inset_60px_0_120px_rgba(130,60,255,0.08)]" />
                <div className="absolute left-[6%] top-1/2 -translate-y-1/2 w-[10px] h-[60px] rounded-full bg-gradient-to-b from-gray-200 to-gray-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante MOBILE */}
      {!isSidebarOpen && !isLoggingOut && (
        <div className="md:hidden fixed top-6 left-5 z-[90]">
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Abrir menú"
            className={`h-11 w-11 flex flex-col justify-center items-center rounded-xl bg-gradient-to-r ${colors.primary} shadow-lg transition-transform duration-200 active:scale-95 ${colors.text}`}
          >
            <span className="block h-[2px] w-6 bg-current rounded-sm mb-[3px]" />
            <span className="block h-[2px] w-6 bg-current rounded-sm mb-[3px]" />
            <span className="block h-[2px] w-6 bg-current rounded-sm" />
          </button>
        </div>
      )}

      {/* Fondo oscuro al abrir menú */}
      {isSidebarOpen && !isLoggingOut && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] transition-opacity duration-500"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* === Sidebar === */}
      <aside
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full
          ${isSidebarOpen ? "w-[86vw] sm:w-72 md:w-80 animate-fadeInFast" : "w-0 md:w-24"}
          ${colors.cardBg}
          border-r-2 ${colors.border} shadow-[6px_0_20px_rgba(0,0,0,0.5)]
          flex flex-col items-center justify-between py-8 px-6 pt-[1.5rem] pb-6 pl-4 pr-4 
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          z-[90] transform
          ${isSidebarOpen 
            ? "translate-x-0 opacity-100 w-[86vw] sm:w-72 md:w-80" 
            : "-translate-x-full md:translate-x-0 opacity-95 w-20"}
          ${isLoggingOut ? "pointer-events-none opacity-50" : ""}`}
      >
        {/* === Encabezado === */}
        <div className="flex flex-col items-center w-full relative">
          <div className="h-14 flex items-center justify-center w-full mb-8">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                disabled={isLoggingOut}
                className={`w-11/12 h-12 flex flex-col justify-center items-center gap-[3px] rounded-2xl bg-gradient-to-r ${colors.primary} transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${colors.text}`}
              >
                <span className="block h-[2px] w-6 bg-current rounded-sm" />
                <span className="block h-[2px] w-6 bg-current rounded-sm" />
                <span className="block h-[2px] w-6 bg-current rounded-sm" />
              </button>
            )}

            {isSidebarOpen && (
              <div className="flex items-center justify-start gap-3 px-3 md:px-4 w-full">
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  disabled={isLoggingOut}
                  aria-label="Cerrar menú"
                  className={`h-12 w-14.5 flex items-center justify-center rounded-xl bg-gradient-to-r ${colors.primary} transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.97] flex-shrink-0`}
                >
                  <Home className={`w-6 h-6 transition-transform duration-300 hover:scale-110 ${colors.icon}`} />
                </button>

                <h1 className={`text-xl md:text-2xl font-bold bg-gradient-to-r ${colors.primary} bg-clip-text text-transparent tracking-tight whitespace-nowrap`}>
                  SmartHome
                </h1>
              </div>
            )}
          </div>
        </div>

        {/* === Navegación - AHORA TODOS TIENEN BORDE === */}
        <nav className="flex flex-col gap-3 items-center w-full flex-grow mt-10 relative">
          {menuItems.map((menu) => {
            const IconComponent = menu.icon
            const isActive = selectedMenu === menu.name

            return (
              <button
                key={menu.name}
                onClick={() => handleSelect(menu)}
                disabled={isLoggingOut}
                className={`flex items-center ${
                  isSidebarOpen ? "justify-start px-5" : "justify-center"
                } gap-3 text-sm font-medium py-2 rounded-xl w-11/12 transition-all duration-300 overflow-hidden
                  /* Borde siempre visible */
                  border 
                  /* Borde más oscuro cuando NO está activo */
                  ${isActive 
                    ? `bg-gradient-to-r ${colors.primary} text-white border-white/20 shadow-lg` 
                    : `${colors.cardHover} border-white/10 hover:border-white/20`
                  }`}
              >
                <IconComponent className={`w-6 h-6 shrink-0 ${isActive ? "text-white" : colors.icon}`} />
                {isSidebarOpen && (
                  <span className={`truncate ${isActive ? "text-white" : ""}`}>
                    {menu.name}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* === Logout === */}
        <div className="w-full flex flex-col items-center">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 w-11/12 justify-center px-3 py-2 rounded-xl
              bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-900/30 hover:border-red-400/50
              transition-all duration-300 font-medium mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="truncate">{isLoggingOut ? "Cerrando..." : "Cerrar sesión"}</span>}
          </button>
        </div>
      </aside>
    </>
  )
}