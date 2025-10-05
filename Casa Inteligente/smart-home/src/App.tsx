"use client"
import { useState } from "react"
import Login from "./login"
import { useThemeByTime } from "./components/hooks/useThemeByTime"
import { Home, Settings, Monitor, Shield, MessageCircle, LogOut } from "lucide-react"

// UI
import SimpleButton from "./components/UI/SimpleButton"

// Sections
import Inicio from "./components/sections/Inicio"
import Casa3d from "./components/sections/Casa3d"
import GestionDispositivos from "./components/sections/GestionDispositivos"
import MonitoreoSeguridad from "./components/sections/MonitoreoSeguridad"
import Configuracion from "./components/sections/Configuracion"

// Widgets
import Chat from "./components/widgets/Chat"

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState("Inicio")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const { colors } = useThemeByTime()

  // Estados globales
  const [devices, setDevices] = useState([
    { name: "Lámpara", on: true, power: "50W", location: "Sala" },
    { name: "TV", on: false, power: "120W", location: "Dormitorio" },
    { name: "PC Gamer", on: true, power: "500W", location: "Estudio" },
  ])

  const [energyUsage, setEnergyUsage] = useState(250)
  const [temperature, setTemperature] = useState(22)
  const [humidity, setHumidity] = useState(45)
  const [filter, setFilter] = useState("Todos")

  // Login
  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />

  const menuItems = [
    { name: "Inicio", icon: Home },
    { name: "Casa 3D", icon: Monitor },
    { name: "Gestión de Dispositivos", icon: Settings },
    { name: "Monitoreo y Seguridad", icon: Shield },
    { name: "Chat", icon: MessageCircle },
    { name: "Configuración", icon: Settings },
  ]

  const handleMenuSelect = (menu: string) => {
    setSelectedMenu(menu)
    setIsSidebarOpen(false)
  }

  return (
    <div className={`flex min-h-screen bg-gradient-to-br pl-10 ${colors.background} ${colors.text} transition-all duration-700 font-inter`}>
      
      {/* Hamburger menu button (visible siempre) */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-5 left-5 z-50 flex flex-col justify-center items-center
          w-12 h-12 rounded-2xl
          bg-gradient-to-br from-cyan-400/30 via-blue-500/20 to-purple-600/30
          backdrop-blur-xl border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)]
          hover:scale-110 hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]
          hover:from-cyan-400/50 hover:to-purple-600/50
          transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}
      >
        <span
          className={`block h-0.5 w-6 rounded-sm bg-white transition-all duration-300
                      ${isSidebarOpen ? "rotate-45 translate-y-2" : ""}`}
        />
        <span
          className={`block h-0.5 w-6 rounded-sm bg-white transition-all duration-300 my-1
                      ${isSidebarOpen ? "opacity-0" : ""}`}
        />
        <span
          className={`block h-0.5 w-6 rounded-sm bg-white transition-all duration-300
                      ${isSidebarOpen ? "-rotate-45 -translate-y-2" : ""}`}
        />
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar Drawer (funciona para mobile y desktop) */}
      <div
        className={`fixed inset-y-0 left-0 w-72 ${colors.cardBg} backdrop-blur-xl p-6 border-r border-current/20 flex flex-col shadow-2xl
          transform transition-transform duration-500 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-50`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          <h1 className={`text-2xl font-bold bg-gradient-to-r ${colors.primary} bg-clip-text text-transparent tracking-tight`}>
            SmartHome
          </h1>
        </div>

        {/* Menú */}
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
                <IconComponent className="w-5 h-5 shrink-0" />
                <span className="truncate">{menu.name}</span>
              </SimpleButton>
            )
          })}
        </nav>

        {/* Cerrar sesión */}
        <SimpleButton
          onClick={() => setIsLoggedIn(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-900/30 hover:border-red-400/40 transition-all duration-200 font-medium"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Cerrar sesión</span>
        </SimpleButton>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col max-h-screen">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scroll">
          {selectedMenu === "Inicio" && (
            <Inicio
              temperature={temperature}
              humidity={humidity}
              energyUsage={energyUsage}
              devices={devices}
            />
          )}
          {selectedMenu === "Casa 3D" && <Casa3d />}
          {selectedMenu === "Gestión de Dispositivos" && (
            <GestionDispositivos
              devices={devices}
              setDevices={setDevices}
              energyUsage={energyUsage}
              setEnergyUsage={setEnergyUsage}
              filter={filter}
              setFilter={setFilter}
            />
          )}
          {selectedMenu === "Monitoreo y Seguridad" && (
            <MonitoreoSeguridad
              temperature={temperature}
              setTemperature={setTemperature}
              humidity={humidity}
              setHumidity={setHumidity}
              energyUsage={energyUsage}
              setEnergyUsage={setEnergyUsage}
            />
          )}
          {selectedMenu === "Configuración" && <Configuracion/>}
          {selectedMenu === "Chat" && <Chat />}
        </div>
      </div>
    </div>
  )
}
