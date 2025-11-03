import { useState, useEffect } from "react";
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

import { useAuth } from "./hooks/useAuth";

// Layout
import HamburgerMenu from "./components/Layout/Sidebar";

export default function AppContent() {
  const { isAuthenticated, loading, login: authLogin } = useAuth();
  const [phase, setPhase] = useState<"login" | "loading" | "dashboard">("loading");
  const [selectedMenu, setSelectedMenu] = useState("Inicio");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { colors } = useThemeByTime();

  // Efecto para manejar la fase de la aplicación basada en la autenticación
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        setPhase("dashboard");
      } else {
        setPhase("login");
      }
    }
  }, [isAuthenticated, loading]);

  const handleLoginSuccess = () => {
    console.log("✅ Login completado → iniciando transición al Dashboard...");
    setPhase("loading");

    setTimeout(() => {
      console.log("🟢 Mostrando Dashboard");
      setPhase("dashboard");
    }, 800);
  };

  const menuItems = [
    { name: "Inicio", icon: Home },
    { name: "Casa 3D", icon: Monitor },
    { name: "Gestión de Dispositivos", icon: Settings },
    { name: "Monitoreo y Seguridad", icon: Shield },
    { name: "Chat", icon: MessageCircle },
    { name: "Configuración", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        Cargando...
      </div>
    );
  }

  return (
    <div
      className={`relative flex min-h-screen bg-gradient-to-br ${colors.background} ${colors.text} transition-all duration-700 font-inter`}
    >
      {/* === LOGIN === */}
      {phase === "login" && (
        <div className="absolute inset-0 z-50">
          <Login onLogin={handleLoginSuccess} />
        </div>
      )}

      {/* === DASHBOARD === */}
      {phase === "dashboard" && (
        <div className="flex flex-row min-h-screen w-full">
          {/* SIDEBAR */}
          <HamburgerMenu
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            menuItems={menuItems}
            selectedMenu={selectedMenu}
            handleMenuSelect={(menu) => {
              // Mantener la sidebar abierta al navegar entre secciones
              setSelectedMenu(menu);
            }}
            onLogout={() => setPhase("login")}
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