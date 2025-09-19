"use client"
import { useState, useEffect } from "react"
import Login from "./login"

// UI
import SimpleButton from "./components/UI/SimpleButton"

// Sections
import Inicio from "./components/sections/Inicio"
import Dispositivos from "./components/sections/Dispositivos"
import Seguridad from "./components/sections/Seguridad"
import Monitoreo from "./components/sections/Monitoreo"
import Energia from "./components/sections/Energia"
import Configuracion from "./components/sections/Configuracion"

// Widgets
import Chat from "./components/widgets/Chat"
import SimpleCard from "./components/UI/SimpleCard"

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState("Inicio")

  // -------------------------------
  // Estados globales
  // -------------------------------
  const [devices, setDevices] = useState([
    { name: "Lámpara", on: true, power: "50W" },
    { name: "TV", on: false, power: "120W" },
    { name: "PC Gamer", on: true, power: "500W" },
  ])

  const [energyUsage, setEnergyUsage] = useState(250)
  const [temperature, setTemperature] = useState(22)
  const [humidity, setHumidity] = useState(45)
  const [filter, setFilter] = useState("Todos")

  // 🔧 Estados para Configuración
  const [ownerName, setOwnerName] = useState("Usuario")
  const [language, setLanguage] = useState("es")
  const [notifications, setNotifications] = useState(true)

  // -------------------------------
  // Hook de tema dinámico por hora
  // -------------------------------
  const [themeByTime, setThemeByTime] = useState("morning")

  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours()
      if (hour >= 6 && hour < 12) setThemeByTime("morning")
      else if (hour >= 12 && hour < 18) setThemeByTime("afternoon")
      else setThemeByTime("night")
    }
    updateTheme()
    const interval = setInterval(updateTheme, 60000)
    return () => clearInterval(interval)
  }, [])

  const themeClasses: Record<string, string> = {
    morning: "bg-gradient-to-br from-slate-100 via-sky-100 to-slate-200 text-slate-800",
    afternoon: "bg-gradient-to-br from-slate-200 via-amber-100 to-slate-300 text-slate-900",
    night: "bg-gradient-to-br from-slate-800 via-purple-900 to-slate-950 text-slate-100",
  }

  // -------------------------------
  // Login
  // -------------------------------
  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />

  return (
    <div
      className={`flex h-screen bg-gradient-to-br text-white transition-colors duration-700 ${themeClasses[themeByTime]}`}
    >
      
      {/* Sidebar */}
      <div className="w-64 bg-gray-950/60 backdrop-blur-lg p-6 border-r border-cyan-500/20 flex flex-col">
        <h1 className="text-2xl font-bold text-cyan-400 mb-8">🏠 SmartHome</h1>

        <nav className="flex flex-col gap-3 flex-grow">
          {[
            "Inicio",
            "Dispositivos",
            "Seguridad",
            "Monitoreo",
            "Energía",
            "Chat",
            "Configuración",
          ].map((menu) => (
            <SimpleButton
              key={menu}
              onClick={() => setSelectedMenu(menu)}
              active={selectedMenu === menu}
            >
              {menu}
            </SimpleButton>
          ))}
        </nav>

        <SimpleButton
          onClick={() => setIsLoggedIn(false)}
          className="bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30"
        >
          🔒 Cerrar sesión
        </SimpleButton>
      </div>

      {/* Main content */}
      <div className="flex-1 p-10 overflow-y-auto">
        {selectedMenu === "Inicio" && <Inicio 
          temperature={temperature}
          humidity={humidity}
          energyUsage={energyUsage}
          devices={devices}
          lightOn={devices.some(d => d.on)}
          securityOn={true}
        />}

        {selectedMenu === "Dispositivos" && (
          <Dispositivos
            devices={devices}
            setDevices={setDevices}
            energyUsage={energyUsage}
            filter={filter}
            setFilter={setFilter}
          />
        )}

        {selectedMenu === "Seguridad" && <Seguridad />}

        {selectedMenu === "Monitoreo" && (
          <Monitoreo
            temperature={temperature}
            setTemperature={setTemperature}
            humidity={humidity}
            setHumidity={setHumidity}
            energyUsage={energyUsage}
            setEnergyUsage={setEnergyUsage}
          />
        )}
        
        {selectedMenu === "Energía" && (
          <Energia
            devices={devices}
            energyUsage={energyUsage}
            setEnergyUsage={setEnergyUsage}
          />
        )}

        {selectedMenu === "Configuración" && (
          <Configuracion
            ownerName={ownerName}
            setOwnerName={setOwnerName}
            language={language}
            setLanguage={setLanguage}
            notifications={notifications}
            setNotifications={setNotifications}
            devices={devices}
          />
        )}

        {selectedMenu === "Chat" && <Chat />}

        {/* Información rápida adicional */}
        {selectedMenu === "Inicio" && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <SimpleCard className="p-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-2">⚡ Consumo promedio diario</h3>
              <p className="text-slate-300">~{energyUsage} kWh</p>
            </SimpleCard>

            <SimpleCard className="p-6">
              <h3 className="text-xl font-bold text-red-400 mb-2">🛡️ Últimas alertas de seguridad</h3>
              <ul className="text-slate-300 list-disc ml-5">
                <li>Ninguna alerta reciente</li>
              </ul>
            </SimpleCard>
          </div>
        )}
      </div>
    </div>
  )
}
