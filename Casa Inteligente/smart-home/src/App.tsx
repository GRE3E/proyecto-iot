"use client";
import { useState } from "react";
import Login from "./pages/login";
import { useThemeByTime } from "./hooks/useThemeByTime";
import { Home, Settings, Monitor, Shield, MessageCircle, Cpu } from "lucide-react";
import { AuthProvider } from "./hooks/useAuth";
import AppContent from "./AppContent";

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

    setTimeout(() => {
      console.log("🟢 Mostrando Dashboard");
      setPhase("dashboard");
    }, 800);
  };

  const menuItems = [
    { name: "Inicio", icon: Home },
    { name: "Casa 3D", icon: Monitor },
    { name: "Gestión de Dispositivos", icon: Cpu },
    { name: "Monitoreo y Seguridad", icon: Shield },
    { name: "Chat", icon: MessageCircle },
    { name: "Configuración", icon: Settings },
  ];
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
