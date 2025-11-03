"use client";
import { useState, useCallback } from "react";
import { useThemeByTime } from "./useThemeByTime";

export type ThemeMode = "day" | "afternoon" | "night";

export function useLogin(onLogin: () => void, login: (username: string, password: string) => Promise<void>) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDoorTransition, setShowDoorTransition] = useState(false);
  const { theme: themeByTime } = useThemeByTime() as { theme: ThemeMode };

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
        // Llamada a la función de login real del backend
        await login(username, password);
        console.log("✅ Inicio de sesión exitoso con backend");
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
      } catch (error: any) {
        setError(error.message || "⌀ Usuario o contraseña incorrectos");
      } finally {
        setIsLoading(false);
      }
    },
    [username, password, onLogin, login]
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
