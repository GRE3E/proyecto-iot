// Menu Hamburguesa
"use client"
import { useEffect, useRef } from "react"
import { Home, LogOut } from "lucide-react"
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
      {/* Botón flotante móvil cuando el menú está cerrado */}
      {!isSidebarOpen && (
        <div className="md:hidden fixed top-4 right-4 z-50">
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Abrir menú"
            className={`h-11 w-11 flex flex-col justify-center items-center rounded-xl
              bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500
              shadow-lg transition-transform duration-200 active:scale-95`}
          >
            {/* Rayas más compactas y centradas */}
            <span className="block h-[2px] w-6 bg-white rounded-sm mb-[3px]"></span>
            <span className="block h-[2px] w-6 bg-white rounded-sm mb-[3px]"></span>
            <span className="block h-[2px] w-6 bg-white rounded-sm"></span>
          </button>
        </div>
      )}

      {/* Fondo oscuro al abrir menú */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-500"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* === Sidebar === */}
      <aside
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full 
          ${isSidebarOpen ? "w-[86vw] sm:w-72 md:w-80" : "w-0 md:w-24"}
          ${colors.cardBg}
          border-r-2 border-cyan-500/20 shadow-[6px_0_20px_rgba(0,0,0,0.5)]
          flex flex-col items-center justify-between py-8 px-6
          pt-[1.5rem] pb-6 pl-4 pr-4 
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          z-50 transform
          ${isSidebarOpen 
            ? "translate-x-0 opacity-100 w-[86vw] sm:w-72 md:w-80" 
            : "-translate-x-full md:translate-x-0 opacity-95 w-20"}`}
        style={{
          boxShadow:
            "8px 0 25px rgba(0,0,0,0.4), inset -1px 0 0 rgba(0,255,255,0.1)",
        }}
      >
        {/* === Sección superior === */}
        <div className="flex flex-col items-center w-full relative">
          {/* Espaciado fijo para mantener alineación vertical igual */}
          <div className="h-14 flex items-center justify-center w-full mb-8">
            {/* Botón hamburguesa (cerrado) */}
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className={`w-11/12 h-12 flex flex-col justify-center items-center gap-[3px] rounded-2xl
                  bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500
                  transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}
              >
                <span className="block h-[2px] w-6 bg-white rounded-sm"></span>
                <span className="block h-[2px] w-6 bg-white rounded-sm"></span>
                <span className="block h-[2px] w-6 bg-white rounded-sm"></span>
              </button>
            )}

            {/* Botón de la casita + texto SmartHome (abierto) */}
            {isSidebarOpen && (
              <div className="flex items-center justify-start gap-3 px-3 md:px-4 w-full">
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  aria-label="Cerrar menú"
                  className={`h-11 w-11 flex items-center justify-center rounded-xl
                    bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500
                    transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.97]`}
                >
                  <Home className="w-5 h-5 text-white transition-transform duration-300 hover:scale-110" />
                </button>

                <h1
                  className={`text-xl md:text-2xl font-bold bg-gradient-to-r ${colors.primary} bg-clip-text text-transparent tracking-tight`}
                >
                  SmartHome
                </h1>
              </div>
            )}
          </div>
        </div>

        {/* Navegación principal */}
        <nav className="flex flex-col gap-3 items-center w-full flex-grow mt-10">
          {menuItems.map((menu) => {
            const IconComponent = menu.icon
            const isActive = selectedMenu === menu.name

            return (
              <SimpleButton
                key={menu.name}
                onClick={() => {
                  handleMenuSelect(menu.name)
                  setIsSidebarOpen(false) // 🔥 Cierra el menú automáticamente
                }}
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
        <div
          className={`w-full flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isSidebarOpen ? "opacity-100 translate-y-0" : "opacity-80 translate-y-1"
          }`}
        >
          <SimpleButton
            onClick={onLogout}
            className="flex items-center gap-3 w-11/12 justify-center px-3 py-2 rounded-xl
            bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-900/30 hover:border-red-400/40
            transition-all duration-300 font-medium mb-2"
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
