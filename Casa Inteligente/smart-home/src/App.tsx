"use client";
import { useState } from "react";
import Login from "./pages/login";
import RecuperarContraseña from "./pages/RecuperarContraseña";
import { useThemeByTime } from "./hooks/useThemeByTime";
import { Home, Settings, Monitor, Shield, MessageCircle, Cpu } from "lucide-react";
import { useAuth } from "./hooks/useAuth";

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
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [selectedMenu, setSelectedMenu] = useState("Inicio");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { colors } = useThemeByTime();

  const menuItems = [
    { name: "Inicio", icon: Home },
    { name: "Casa 3D", icon: Monitor },
    { name: "Gestión de Dispositivos", icon: Cpu },
    { name: "Monitoreo y Seguridad", icon: Shield },
    { name: "Chat", icon: MessageCircle },
    { name: "Configuración", icon: Settings },
  ];

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div
      className={`relative flex min-h-screen bg-gradient-to-br ${colors.background} ${colors.text} transition-all duration-700 font-inter`}
    >
      {/* === LOGIN === */}
      {!isAuthenticated && (
        <div className="absolute inset-0 z-50">
          <Login onNavigate={setSelectedMenu} />
        </div>
      )}

      {/* === RECUPERAR CONTRASEÑA === */}
      {!isAuthenticated && selectedMenu === "Recuperar Contraseña" && (
        <div className="absolute inset-0 z-50">
          <RecuperarContraseña />
        </div>
      )}

      {/* === DASHBOARD === */}
      {isAuthenticated && (
        <div className="flex flex-row min-h-screen w-full">
          {/* SIDEBAR */}
          <HamburgerMenu
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            menuItems={menuItems}
            selectedMenu={selectedMenu}
            handleMenuSelect={(menu) => {
              setSelectedMenu(menu);
            }}
            onLogout={logout}
            colors={colors}
          />

          {/* CONTENIDO PRINCIPAL */}
          <main
            className={`transition-all duration-500 ease-in-out flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scroll
              ${isSidebarOpen ? "ml-0 md:ml-80" : "ml-0 md:ml-24"}
            `}
          >
            {selectedMenu === "Inicio" && <Inicio />}
            {selectedMenu === "Casa 3D" && <Casa3d />}
            {selectedMenu === "Gestión de Dispositivos" && <GestionDispositivos />}
            {selectedMenu === "Monitoreo y Seguridad" && <MonitoreoSeguridad />}
            {selectedMenu === "Configuración" && <Configuracion />}
            {selectedMenu === "Chat" && <Chat />}
          </main>
        </div>
      )}
    </div>
  );
}