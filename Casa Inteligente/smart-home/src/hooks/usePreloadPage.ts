import { useEffect, useRef } from "react";

/**
 * Hook para precargar componentes lazy durante transiciones
 * Comienza a cargar el componente mientras se ejecuta la animación
 */
export const usePreloadPage = (
  selectedMenu: string,
  preloadDelay: number = 100 // Delay antes de iniciar precarga (ms)
) => {
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      // Solo precargar si no se ha hecho antes
      if (preloadedRef.current.has(selectedMenu)) return;

      // Marcar como precargado
      preloadedRef.current.add(selectedMenu);

      // Precargar el componente correspondiente
      switch (selectedMenu) {
        case "Inicio":
          import("../pages/Inicio");
          break;
        case "Casa 3D":
          import("../pages/Casa3d");
          break;
        case "Gestión de Dispositivos":
          import("../pages/GestionDispositivos");
          break;
        case "Monitoreo y Seguridad":
          import("../pages/MonitoreoSeguridad");
          break;
        case "Música":
          import("../pages/Musica");
          break;
        case "Chat":
          import("../pages/Chat");
          break;
        case "Rutinas":
          import("../pages/Rutinas");
          break;
        case "Configuración":
          import("../pages/Configuracion");
          break;
        case "Recuperar Contraseña":
          import("../pages/RecuperarContraseña");
          break;
        case "Login":
          import("../pages/login");
          break;
      }
    }, preloadDelay);

    return () => clearTimeout(timer);
  }, [selectedMenu, preloadDelay]);
};
