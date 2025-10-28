//Menu Hamburguesa
"use client"
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
  return (
    <>
      {/* Sidebar */}
      <div
        className={`${isSidebarOpen ? "w-72" : "w-31"} ${colors.cardBg} backdrop-blur-xl p-6 border-r border-current/20 flex flex-col shadow-2xl
          transform transition-all duration-300 ease-in-out z-50`}
      >
        {/* Botón menú hamburguesa */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`mb-8 relative w-18 h-13 rounded-xl
            ${isSidebarOpen ? "flex flex-row items-center justify-start gap-3 bg-transparent" : "flex flex-col justify-center items-center bg-gradient-to-br from-cyan-500 to-purple-600"}
            hover:from-cyan-400/50 hover:to-purple-600/50
            transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}>
          {isSidebarOpen ? (
            <>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <h1
                className={`text-2xl font-bold bg-gradient-to-r ${colors.primary} bg-clip-text text-transparent tracking-tight opacity-100 transition-opacity duration-300`}
              >
                SmartHome
              </h1>
            </>
          ) : (
            <>
              <span
                className={`block h-0.5 w-6 rounded-sm bg-white transition-all duration-500`}
              />
              <span
                className={`block h-0.5 w-6 rounded-sm bg-white transition-all duration-500 my-1`}
              />
              <span
                className={`block h-0.5 w-6 rounded-sm bg-white transition-all duration-500`}
              />
            </>
          )}
        </button>

        <nav className="flex flex-col gap-2 flex-grow">
          {menuItems.map((menu) => {
            const IconComponent = menu.icon
            return (
              <SimpleButton
                key={menu.name}
                onClick={() => handleMenuSelect(menu.name)}
                active={selectedMenu === menu.name}
                className="flex items-center gap-3 text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200"
              >
                <IconComponent className="w-6 h-6 shrink-0" />
                <span className={`truncate ${isSidebarOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}>{menu.name}</span>
              </SimpleButton>
            )
          })}
        </nav>

        <SimpleButton
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-900/30 hover:border-red-400/40 transition-all duration-200 font-medium"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={`truncate ${isSidebarOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}>Cerrar sesión</span>
        </SimpleButton>
      </div>
    </>
  )
}
