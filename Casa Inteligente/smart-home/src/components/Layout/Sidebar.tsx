//Menu Hamburguesa
"use client"
import { useEffect, useRef } from "react"
import { Home, LogOut, X } from "lucide-react"
import SimpleButton from "../UI/Button"

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
  const sidebarRef = useRef<HTMLDivElement>(null)

  // 🔹 Detectar clic fuera del menú
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
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

  return (
    <>
      {/* Fondo semitransparente (overlay) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-500"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* === SIDEBAR === */}
      <aside
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full ${
          isSidebarOpen ? "w-72" : "w-20"
        } ${colors.cardBg} backdrop-blur-xl 
          border-r-2 border-cyan-500/20 shadow-[6px_0_20px_rgba(0,0,0,0.5)]
          flex flex-col items-center justify-between py-6
          transition-all duration-500 ease-in-out z-50`}
        style={{
          boxShadow:
            "8px 0 25px rgba(0,0,0,0.4), inset -1px 0 0 rgba(0,255,255,0.1)",
        }}
      >
        {/* Sección superior (botón hamburguesa o cerrar) */}
        <div className="flex flex-col items-center gap-8 w-full relative">
          {/* Botón hamburguesa — visible solo si está cerrado */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`w-12 h-12 flex flex-col justify-center items-center rounded-xl
                bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500
                transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}
            >
              <span className="block h-0.5 w-6 bg-white rounded-sm mb-1"></span>
              <span className="block h-0.5 w-6 bg-white rounded-sm mb-1"></span>
              <span className="block h-0.5 w-6 bg-white rounded-sm"></span>
            </button>
          )}

          {/* Botón “X” cerrar — visible solo si está abierto */}
          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-4 top-2 p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Logo y título (solo visible si el menú está abierto) */}
          {isSidebarOpen && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <h1
                className={`text-2xl font-bold bg-gradient-to-r ${colors.primary} bg-clip-text text-transparent tracking-tight`}
              >
                SmartHome
              </h1>
            </div>
          )}
        </div>

        {/* Navegación principal */}
        <nav className="flex flex-col gap-3 items-center w-full flex-grow mt-10">
          {menuItems.map((menu) => {
            const IconComponent = menu.icon
            const isActive = selectedMenu === menu.name

            return (
              <SimpleButton
                key={menu.name}
                onClick={() => handleMenuSelect(menu.name)}
                active={isActive}
                className={`flex items-center ${
                  isSidebarOpen ? "justify-start px-5" : "justify-center"
                } gap-3 text-sm font-medium py-2 rounded-xl w-11/12
                transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-br from-cyan-500/30 to-purple-600/30 text-white border border-cyan-500/40"
                    : "hover:bg-white/10"
                }`}
              >
                <IconComponent className="w-6 h-6 shrink-0" />
                {isSidebarOpen && (
                  <span className="truncate transition-opacity duration-300">
                    {menu.name}
                  </span>
                )}
              </SimpleButton>
            )
          })}
        </nav>

        {/* Botón Cerrar Sesión */}
        <div className="w-full flex flex-col items-center">
          <SimpleButton
            onClick={onLogout}
            className="flex items-center gap-3 w-11/12 justify-center px-3 py-2 rounded-xl
            bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-900/30 hover:border-red-400/40
            transition-all duration-200 font-medium mb-2"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && (
              <span className="truncate transition-opacity duration-300">
                Cerrar sesión
              </span>
            )}
          </SimpleButton>
        </div>
      </aside>
    </>
  )
}