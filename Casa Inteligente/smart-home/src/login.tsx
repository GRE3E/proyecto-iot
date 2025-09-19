"use client"

import type React from "react"
import { useState, useEffect } from "react"

// -----------------
// Tipos de Props
// -----------------
interface LoginProps {
  onLogin: () => void
}

interface RegistrationFormProps {
  isDarkMode: boolean
  handleRegister: (e: React.FormEvent) => Promise<void>
  username: string
  setUsername: (value: string) => void
  password: string
  setPassword: (value: string) => void
  confirmPassword: string
  setConfirmPassword: (value: string) => void
  isLoading: boolean
  error: string
  toggleForm: () => void
}

interface LoginFormProps {
  isDarkMode: boolean
  handleLogin: (e: React.FormEvent) => Promise<void>
  username: string
  setUsername: (value: string) => void
  password: string
  setPassword: (value: string) => void
  isLoading: boolean
  error: string
  toggleForm: () => void
}

// -----------------
// Registro
// -----------------
function RegistrationForm({
  isDarkMode,
  handleRegister,
  username,
  setUsername,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  isLoading,
  error,
  toggleForm,
}: RegistrationFormProps) {
  return (
    <div
      className={`relative z-10 w-96 backdrop-blur-xl p-8 rounded-2xl shadow-xl border transform transition-all duration-700 ease-in-out ${
        isDarkMode
          ? "bg-gray-900/80 border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-cyan-500/20 scale-105"
          : "bg-white/90 border-blue-200/50 hover:border-blue-300/70 hover:shadow-blue-200/30 scale-100"
      }`}
    >
      {/* Fondo interno */}
      <div
        className={`absolute inset-0 rounded-2xl blur-xl -z-10 transition-colors duration-700 ${
          isDarkMode
            ? "bg-gradient-to-r from-purple-900/30 to-cyan-900/30"
            : "bg-gradient-to-r from-blue-100/30 to-indigo-100/30"
        }`}
      ></div>

      <h1
        className={`text-3xl font-bold text-center bg-clip-text text-transparent mb-2 transition-all duration-700 ${
          isDarkMode
            ? "bg-gradient-to-r from-cyan-400 to-purple-400"
            : "bg-gradient-to-r from-blue-600 to-indigo-600"
        }`}
      >
        CREAR CUENTA
      </h1>
      <p
        className={`text-center mb-6 text-sm transition-colors duration-700 ${
          isDarkMode ? "text-gray-300" : "text-gray-600"
        }`}
      >
        Únete a la comunidad Smart Home
      </p>

      {/* Formulario */}
      <form onSubmit={handleRegister} className="flex flex-col gap-5">
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={`w-full p-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:shadow-lg ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 focus:ring-cyan-400"
              : "bg-white/80 border-blue-200 text-gray-800 placeholder-gray-500 focus:ring-blue-400"
          }`}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full p-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:shadow-lg ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 focus:ring-cyan-400"
              : "bg-white/80 border-blue-200 text-gray-800 placeholder-gray-500 focus:ring-blue-400"
          }`}
        />

        <input
          type="password"
          placeholder="Confirmar Contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`w-full p-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:shadow-lg ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 focus:ring-cyan-400"
              : "bg-white/80 border-blue-200 text-gray-800 placeholder-gray-500 focus:ring-blue-400"
          }`}
        />

        {error && (
          <p className="text-red-500 text-sm text-center animate-pulse">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`relative rounded-lg py-3 font-bold transition-all duration-300 shadow-lg hover:scale-105 text-white ${
            isDarkMode
              ? "bg-gray-900 hover:bg-gray-800 shadow-cyan-500/25"
              : "bg-gray-900 hover:bg-gray-800 shadow-blue-300/25"
          }`
        }
        >
          {isLoading ? "REGISTRANDO..." : "CREAR CUENTA"}
        </button>
      </form>

      <div className="text-center mt-4">
        <button
          onClick={toggleForm}
          className={`transition-all duration-300 font-semibold text-sm ${
            isDarkMode ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-800"
          }`}
        >
          ¿Ya tienes una cuenta? Inicia sesión
        </button>
      </div>
    </div>
  )
}

// -----------------
// Login
// -----------------
function LoginForm({
  isDarkMode,
  handleLogin,
  username,
  setUsername,
  password,
  setPassword,
  isLoading,
  error,
  toggleForm,
}: LoginFormProps) {
  return (
    <div
      className={`relative z-10 w-96 backdrop-blur-xl p-8 rounded-2xl shadow-xl border transform transition-all duration-700 ease-in-out ${
        isDarkMode
          ? "bg-gray-900/80 border-cyan-500/30 hover:shadow-cyan-500/20 scale-105"
          : "bg-white/90 border-blue-200/50 hover:shadow-blue-200/30 scale-100"
      }`}
    >
      <h1
        className={`text-3xl font-bold text-center bg-clip-text text-transparent mb-2 transition-all duration-700 ${
          isDarkMode
            ? "bg-gradient-to-r from-cyan-400 to-purple-400"
            : "bg-gradient-to-r from-blue-600 to-indigo-600"
        }`}
      >
        SMART HOME
      </h1>
      <p
        className={`text-center mb-6 text-sm transition-colors duration-700 ${
          isDarkMode ? "text-gray-300" : "text-gray-600"
        }`}
      >
        SISTEMA DE CONTROL AVANZADO
      </p>

      <form onSubmit={handleLogin} className="flex flex-col gap-5">
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={`w-full p-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 focus:ring-cyan-400"
              : "bg-white/80 border-blue-200 text-gray-800 placeholder-gray-500 focus:ring-blue-400"
          }`}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full p-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 ${
            isDarkMode
              ? "bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 focus:ring-cyan-400"
              : "bg-white/80 border-blue-200 text-gray-800 placeholder-gray-500 focus:ring-blue-400"
          }`}
        />

        {error && (
          <p className="text-red-500 text-sm text-center animate-pulse">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`rounded-lg py-3 font-bold transition-all duration-300 shadow-lg hover:scale-105 text-white ${
            isDarkMode
              ? "bg-gray-900 hover:bg-gray-800 shadow-cyan-500/25"
              : "bg-gray-900 hover:bg-gray-800 shadow-blue-300/25"
          }`
        }
        >
          {isLoading ? "AUTENTICANDO..." : "ACCEDER AL SISTEMA"}
        </button>
      </form>

      <div className="text-center mt-4">
        <button
          onClick={toggleForm}
          className={`transition-all duration-300 font-semibold text-sm ${
            isDarkMode ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-800"
          }`}
        >
          ¿No tienes una cuenta? Regístrate
        </button>
      </div>
    </div>
  )
}

// -----------------
// Componente principal
// -----------------
export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  // ----------------- Fondo dinámico partículas
  useEffect(() => {
    const particles = document.querySelectorAll(".particle")
    particles.forEach((particle, index) => {
      const element = particle as HTMLElement
      element.style.animationDelay = `${index * 0.5}s`
    })
  }, [])

  // ----------------- Tema automático (día/noche)
  useEffect(() => {
    const updateThemeByTime = () => {
      const hour = new Date().getHours()
      if (hour >= 6 && hour < 18) {
        setIsDarkMode(false) // Día
      } else {
        setIsDarkMode(true) // Noche
      }
    }
    updateThemeByTime()
    const interval = setInterval(updateThemeByTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // ----------------- Login / Registro
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    if (username === "admin" && password === "1234") {
      setError("")
      onLogin()
    } else {
      setError("❌ Usuario o contraseña incorrectos")
    }
    setIsLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setIsLoading(false)
      return
    }
    await new Promise((r) => setTimeout(r, 1500))
    console.log("Usuario registrado:", { username, password })
    
    setError("")
    setIsLoading(false)
    setIsRegistering(false)
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-1000 ease-in-out ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-purple-900 to-black"
          : "bg-gradient-to-br from-blue-50 via-indigo-100 to-blue-50"
      }`}
    >
      {/* Fondo imagen */}
      <div className="absolute inset-0 opacity-70 transition-opacity duration-1000">
        <img
          src="/img/FondoLogin2.webp"
          alt="Smart Home Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Capa extra con rejilla animada */}
      <div className="absolute inset-0 opacity-30 transition-colors duration-1000">
        <div
          className={`absolute inset-0 ${
            isDarkMode
              ? "bg-gradient-to-r from-purple-900/20 to-cyan-900/20"
              : "bg-gradient-to-r from-blue-200/20 to-indigo-200/20"
          }`}
        >
          
        </div>
      </div>

      {/* Partículas */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className={`particle absolute w-1 h-1 rounded-full animate-bounce opacity-40 ${
              isDarkMode ? "bg-cyan-400" : "bg-blue-400"
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          ></div>
        ))}
      </div>

      {/* Formulario */}
      {isRegistering ? (
        <RegistrationForm
          isDarkMode={isDarkMode}
          handleRegister={handleRegister}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          isLoading={isLoading}
          error={error}
          toggleForm={() => setIsRegistering(false)}
        />
      ) : (
        <LoginForm
          isDarkMode={isDarkMode}
          handleLogin={handleLogin}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          isLoading={isLoading}
          error={error}
          toggleForm={() => setIsRegistering(true)}
        />
      )}
    </div>
  )
}

