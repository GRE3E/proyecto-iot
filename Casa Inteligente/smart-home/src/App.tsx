"use client";
import { useState } from "react";
import Login from "./pages/login";
import { useThemeByTime } from "./hooks/useThemeByTime";
import { Home, Settings, Monitor, Shield, MessageCircle } from "lucide-react";

// Secciones
import Inicio from "./pages/Inicio";
import Casa3d from "./pages/Casa3d";
import GestionDispositivos from "./pages/GestionDispositivos";
import MonitoreoSeguridad from "./pages/MonitoreoSeguridad";
import Configuracion from "./pages/Configuracion";
import Chat from "./pages/Chat";

// Layout
import HamburgerMenu from "./components/Layout/Sidebar";

export default function App() {
  const [phase, setPhase] = useState<"login" | "loading" | "dashboard">("login");
  const [selectedMenu, setSelectedMenu] = useState("Inicio");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { colors } = useThemeByTime();

  const handleLogin = () => {
    console.log("✅ Login completado → iniciando transición al Dashboard...");
    setPhase("loading");

    // Asegura desmontaje limpio del Login
    setTimeout(() => {
      console.log("🟢 Mostrando Dashboard");
      setPhase("dashboard");
    }, 800); // suficiente para que termine la animación de cierre
  };

  const menuItems = [
    { name: "Inicio", icon: Home },
    { name: "Casa 3D", icon: Monitor },
    { name: "Gestión de Dispositivos", icon: Settings },
    { name: "Monitoreo y Seguridad", icon: Shield },
    { name: "Chat", icon: MessageCircle },
    { name: "Configuración", icon: Settings },
  ];

  return (
    <div
      className={`relative flex min-h-screen bg-gradient-to-br ${colors.background} ${colors.text} transition-all duration-700 font-inter`}
    >
      {/* === LOGIN === */}
      {phase === "login" && (
        <div className="absolute inset-0 z-50">
          <Login onLogin={handleLogin} />
        </div>
      )}

      {/* === DASHBOARD === */}
      {phase === "dashboard" && (
        <div className="relative flex flex-1 flex-col min-h-screen">
          <HamburgerMenu
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            menuItems={menuItems}
            selectedMenu={selectedMenu}
            handleMenuSelect={(menu) => {
              setSelectedMenu(menu);
              setIsSidebarOpen(false);
            }}
            onLogout={() => setPhase("login")}
            colors={colors}
          />

          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scroll">
            {selectedMenu === "Inicio" && <Inicio />}
            {selectedMenu === "Casa 3D" && <Casa3d />}
            {selectedMenu === "Gestión de Dispositivos" && <GestionDispositivos />}
            {selectedMenu === "Monitoreo y Seguridad" && <MonitoreoSeguridad />}
            {selectedMenu === "Configuración" && <Configuracion />}
            {selectedMenu === "Chat" && <Chat />}
          </div>
        </div>
      )}
    </div>
  );
}
