"use client"
import { useState } from "react"
import Login from "./login"
import { useThemeByTime } from "./components/hooks/useThemeByTime"

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

  const { theme, colors } = useThemeByTime()

  // Estados globales
  const [devices, setDevices] = useState([
    { name: "Lámpara", on: true, power: "50W" },
    { name: "TV", on: false, power: "120W" },
    { name: "PC Gamer", on: true, power: "500W" },
  ])

  const [energyUsage, setEnergyUsage] = useState(250)
  const [temperature, setTemperature] = useState(22)
  const [humidity, setHumidity] = useState(45)
  const [filter, setFilter] = useState("Todos")

  // Estados para Configuración
  const [ownerName, setOwnerName] = useState("Eddyn")
  const [language, setLanguage] = useState("es")
  const [notifications, setNotifications] = useState(true)

  // Login
  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />

  return (
    <div className={`flex h-screen bg-gradient-to-br ${colors.background} ${colors.text} transition-all duration-700`}>
      <div className={`w-64 ${colors.cardBg} backdrop-blur-lg p-6 border-r border-current/20 flex flex-col`}>
        <h1 className={`text-2xl font-bold bg-gradient-to-r ${colors.primary} bg-clip-text text-transparent mb-8`}>
          🏠 SmartHome
        </h1>

        <nav className="flex flex-col gap-3 flex-grow">
          {["Inicio", "Dispositivos", "Seguridad", "Monitoreo", "Energía", "Chat", "Configuración"].map((menu) => (
            <SimpleButton key={menu} onClick={() => setSelectedMenu(menu)} active={selectedMenu === menu}>
              {menu}
            </SimpleButton>
          ))}
        </nav>

        <SimpleButton
          onClick={() => setIsLoggedIn(false)}
          className="bg-red-950/30 border-red-500/30 text-red-400 hover:bg-red-900/40 hover:border-red-400/50"
        >
          🔒 Cerrar sesión
        </SimpleButton>
      </div>

      {/* Main content */}
      <div className="flex-1 p-10 overflow-y-auto">
        {selectedMenu === "Inicio" && (
          <Inicio
            temperature={temperature}
            humidity={humidity}
            energyUsage={energyUsage}
            devices={devices}
            lightOn={devices.some((d) => d.on)}
            securityOn={true}
          />
        )}

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
          <Energia devices={devices} energyUsage={energyUsage} setEnergyUsage={setEnergyUsage} />
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

        {selectedMenu === "Inicio" && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <SimpleCard className="p-6">
              <h3 className={`text-xl font-bold bg-gradient-to-r ${colors.accent} bg-clip-text text-transparent mb-2`}>
                ⚡ Consumo promedio diario
              </h3>
              <p className={colors.text}>~{energyUsage} kWh</p>
            </SimpleCard>

            <SimpleCard className="p-6">
              <h3
                className={`text-xl font-bold bg-gradient-to-r ${colors.secondary} bg-clip-text text-transparent mb-2`}
              >
                🛡️ Últimas alertas de seguridad
              </h3>
              <ul className={`${colors.text} list-disc ml-5`}>
                <li>Ninguna alerta reciente</li>
              </ul>
            </SimpleCard>
          </div>
        )}
      </div>
    </div>
  )
}