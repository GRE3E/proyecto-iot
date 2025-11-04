"use client";
import { useState, useCallback } from "react";
import { useThemeByTime } from "./useThemeByTime";
import { useAuth } from "./useAuth"; // Importar useAuth

export type ThemeMode = "day" | "afternoon" | "night";

export function useLogin(onLogin: () => void) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDoorTransition, setShowDoorTransition] = useState(false);
  const { theme: themeByTime } = useThemeByTime() as { theme: ThemeMode };
  const { login: authLogin } = useAuth(); // Obtener la función login del contexto de autenticación

  const handleLogin = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!username || !password) {
        setError("⚠ Por favor ingrese usuario y contraseña");
        return;
      }

      setError("");
      setIsLoading(true);

      try {
        await authLogin(username, password); // Usar la función login del contexto

        console.log("✅ Login completado");
        setShowDoorTransition(true);

        // Inicia efecto de zoom o animación
        setTimeout(() => {
          console.log("🔵 Iniciando zoom...");
        }, 2600);

        // Termina animación → login final
        setTimeout(() => {
          console.log("🟢 Ejecutando onLogin()");
          onLogin(); // <-- Este sí viene del App.tsx
        }, 4000);
      } catch (err: any) {
        console.error("Error durante el login:", err);
        setError(err.response?.data?.message || "Error de autenticación");
        setIsLoading(false);
      }
    },
    [username, password, onLogin, authLogin] // Añadir authLogin a las dependencias
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isLoading) handleLogin();
    },
    [isLoading, handleLogin]
  );

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
  };
}
