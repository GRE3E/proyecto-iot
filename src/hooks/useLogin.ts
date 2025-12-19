"use client";
import { useState, useCallback } from "react";
import { useThemeByTime } from "./useThemeByTime";
import { useAuth } from "./useAuth"; // Importar useAuth

export type ThemeMode = "light" | "dark";

export function useLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false); // Nuevo estado para controlar la visibilidad del modal de error
  const [isLoading, setIsLoading] = useState(false);
  const [showDoorTransition, setShowDoorTransition] = useState(false);
  const { theme: themeByTime } = useThemeByTime() as { theme: ThemeMode };
  const { login: authLogin } = useAuth(); // Obtener la función login del contexto de autenticación

  const handleLogin = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!username || !password) {
        setError("⚠ Por favor ingrese usuario y contraseña");
        setShowErrorModal(true); // Mostrar modal de error
        return;
      }

      setError("");
      setIsLoading(true);

      try {
        await authLogin(username, password); // Usar la función login del contexto

        setShowDoorTransition(true);

        // Inicia efecto de zoom o animación
        setTimeout(() => {
        }, 2600);

        // Termina animación → login final
        setTimeout(() => {
        }, 4000);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Credenciales incorrectas");
        setShowErrorModal(true); // Mostrar modal de error
        setTimeout(() => {
          closeErrorModal();
        }, 1500); // Auto-cerrar modal después de 1.5 segundos
      } finally {
        setIsLoading(false);
      }
    },
    [username, password, authLogin] // Añadir authLogin a las dependencias
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isLoading) handleLogin();
    },
    [isLoading, handleLogin]
  );

  const closeErrorModal = useCallback(() => {
    setShowErrorModal(false);
    setError("");
  }, []);

  return {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    isLoading,
    showDoorTransition,
    themeByTime,
    handleLogin,
    handleKeyPress,
    showErrorModal,
    closeErrorModal,
  };
}
