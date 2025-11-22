"use client";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useThemeByTime } from "./hooks/useThemeByTime";
import { Home, Settings, Monitor, Shield, MessageCircle, Cpu, ListTodo, Music } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import HamburgerMenu from "./components/Layout/Sidebar";

const Login = lazy(() => import("./pages/login"));
const RecuperarContraseña = lazy(() => import("./pages/RecuperarContraseña"));
const Inicio = lazy(() => import("./pages/Inicio"));
const Casa3d = lazy(() => import("./pages/Casa3d"));
const GestionDispositivos = lazy(() => import("./pages/GestionDispositivos"));
const MonitoreoSeguridad = lazy(() => import("./pages/MonitoreoSeguridad"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const Chat = lazy(() => import("./pages/Chat"));
const Rutinas = lazy(() => import("./pages/Rutinas"));
const Musica = lazy(() => import("./pages/Musica"));

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
    { name: "Música", icon: Music },
    { name: "Chat", icon: MessageCircle },
    { name: "Rutinas", icon: ListTodo },
    { name: "Configuración", icon: Settings },
  ];

  const pathByMenu = useMemo<Record<string, string>>(
    () => ({
      "Inicio": "/inicio",
      "Casa 3D": "/casa3d",
      "Gestión de Dispositivos": "/dispositivos",
      "Monitoreo y Seguridad": "/seguridad",
      "Música": "/musica",
      "Chat": "/chat",
      "Rutinas": "/rutinas",
      "Configuración": "/configuracion",
      "Recuperar Contraseña": "/recuperar",
    }),
    []
  );

  const menuByPath = useMemo<Record<string, string>>(
    () => ({
      "/inicio": "Inicio",
      "/casa3d": "Casa 3D",
      "/dispositivos": "Gestión de Dispositivos",
      "/seguridad": "Monitoreo y Seguridad",
      "/musica": "Música",
      "/chat": "Chat",
      "/rutinas": "Rutinas",
      "/configuracion": "Configuración",
      "/recuperar": "Recuperar Contraseña",
    }),
    []
  );

  const lastPushedPathRef = useRef<string | null>(null);

  useEffect(() => {
    const current = window.location.pathname;
    const initial = menuByPath[current] || "Inicio";
    setSelectedMenu(initial);
  }, [menuByPath]);

  useEffect(() => {
    const handler = () => {
      const m = menuByPath[window.location.pathname];
      if (m) setSelectedMenu(m);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [menuByPath]);

  useEffect(() => {
    const path = pathByMenu[selectedMenu] || "/inicio";
    if (lastPushedPathRef.current !== path) {
      window.history.pushState(null, "", path);
      lastPushedPathRef.current = path;
    }
  }, [selectedMenu, pathByMenu]);

  useEffect(() => {
    if (isAuthenticated && window.location.pathname === "/login") {
      setSelectedMenu("Inicio");
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div
      className={`relative flex min-h-screen ${colors.background} ${colors.text} transition-all duration-700 font-inter`}
    >
      {/* === LOGIN / RECUPERAR === */}
      {!isAuthenticated && (
        <div className="absolute inset-0 z-50">
          <Suspense fallback={<div>Cargando...</div>}>
            {selectedMenu === "Recuperar Contraseña" ? (
              <RecuperarContraseña />
            ) : (
              <Login onNavigate={setSelectedMenu} />
            )}
          </Suspense>
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
            <Suspense fallback={<div>Cargando contenido...</div>}>
              {selectedMenu === "Inicio" && <Inicio />}
              {selectedMenu === "Casa 3D" && <Casa3d />}
              {selectedMenu === "Gestión de Dispositivos" && <GestionDispositivos />}
              {selectedMenu === "Monitoreo y Seguridad" && <MonitoreoSeguridad />}
              {selectedMenu === "Música" && <Musica />}
              {selectedMenu === "Chat" && <Chat />}
              {selectedMenu === "Rutinas" && <Rutinas />}
              {selectedMenu === "Configuración" && <Configuracion />}
            </Suspense>
          </main>
        </div>
      )}
    </div>
  );
}