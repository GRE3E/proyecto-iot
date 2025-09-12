"use client"

import type React from "react"

import { useState, useEffect } from "react"

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
  toggleForm
}: RegistrationFormProps) {
  return (
    <div
      className={`relative z-10 w-96 backdrop-blur-xl p-8 rounded-2xl shadow-xl border transition-all duration-300 hover:shadow-2xl ${
        isDarkMode
          ? "bg-gray-900/80 border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-cyan-500/20"
          : "bg-white/90 border-blue-200/50 hover:border-blue-300/70 hover:shadow-blue-200/30"
      }`}
    >
      <div
        className={`absolute inset-0 rounded-2xl blur-xl -z-10 ${
          isDarkMode
            ? "bg-gradient-to-r from-purple-900/30 to-cyan-900/30"
            : "bg-gradient-to-r from-blue-100/30 to-indigo-100/30"
        }`}
      ></div>

      <h1
        className={`text-3xl font-bold text-center bg-clip-text text-transparent mb-2 ${
          isDarkMode ? "bg-gradient-to-r from-cyan-400 to-purple-400" : "bg-gradient-to-r from-blue-600 to-indigo-600"
        }`}
      >
        CREAR CUENTA
      </h1>
      <p className={`text-center mb-6 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
        Únete a la comunidad Smart Home
      </p>

      <form onSubmit={handleRegister} className="flex flex-col gap-5">
        <div className="relative">
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full p-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:shadow-lg ${
              isDarkMode
                ? "bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 focus:ring-cyan-400 focus:border-cyan-400 focus:shadow-cyan-400/25"
                : "bg-white/80 border-blue-200 text-gray-800 placeholder-gray-500 focus:ring-blue-400 focus:border-blue-400 focus:shadow-blue-200/25"
            }`}
          />
        </div>

        <div className="relative">
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:shadow-lg ${
              isDarkMode
                ? "bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 focus:ring-cyan-400 focus:border-cyan-400 focus:shadow-cyan-400/25"
                : "bg-white/80 border-blue-200 text-gray-800 placeholder-gray-500 focus:ring-blue-400 focus:border-blue-400 focus:shadow-blue-200/25"
            }`}
          />
        </div>

        <div className="relative">
          <input
            type="password"
            placeholder="Confirmar Contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full p-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:shadow-lg ${
              isDarkMode
                ? "bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 focus:ring-cyan-400 focus:border-cyan-400 focus:shadow-cyan-400/25"
                : "bg-white/80 border-blue-200 text-gray-800 placeholder-gray-500 focus:ring-blue-400 focus:border-blue-400 focus:shadow-blue-200/25"
            }`}
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center animate-pulse">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className={`relative rounded-lg py-3 font-bold transition-all duration-300 shadow-lg hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden text-white ${
            isDarkMode
              ? "bg-gray-900 hover:bg-gray-800 shadow-cyan-500/25 hover:shadow-cyan-500/40 border border-cyan-500/30"
              : "bg-gray-900 hover:bg-gray-800 shadow-blue-300/25 hover:shadow-blue-300/40 border border-blue-500/30"
          }`}
          style={{ backgroundColor: "#111827" }}
        >
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          )}
          <span className="relative z-10 text-white font-bold tracking-wide drop-shadow-lg">
            {isLoading ? "REGISTRANDO..." : "CREAR CUENTA"}
          </span>
        </button>
      </form>

      <div className="text-center mt-4">
        <button 
          onClick={toggleForm}
          className={`transition-all duration-300 font-semibold text-sm ${
            isDarkMode
              ? "text-cyan-400 hover:text-cyan-300"
              : "text-blue-600 hover:text-blue-800"
          }`}
        >
          ¿Ya tienes una cuenta? Inicia sesión
        </button>
      </div>
    </div>
  )
}

function LoginForm({ 
  isDarkMode, 
  handleLogin, 
  username, 
  setUsername, 
  password, 
  setPassword, 
  isLoading, 
  error,
  toggleForm
}: LoginFormProps) {
  return (
    <div
      className={`relative z-10 w-96 backdrop-blur-xl p-8 rounded-2xl shadow-xl border transition-all duration-300 hover:shadow-2xl ${
        isDarkMode
          ? "bg-gray-900/80 border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-cyan-500/20"
          : "bg-white/90 border-blue-200/50 hover:border-blue-300/70 hover:shadow-blue-200/30"
      }`}
    >
      <div
        className={`absolute inset-0 rounded-2xl blur-xl -z-10 ${
          isDarkMode
            ? "bg-gradient-to-r from-purple-900/30 to-cyan-900/30"
            : "bg-gradient-to-r from-blue-100/30 to-indigo-100/30"
        }`}
      ></div>

      <div className="flex justify-center mb-6">
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
              isDarkMode
                ? "bg-gradient-to-br from-cyan-500 to-purple-600 shadow-cyan-500/50"
                : "bg-gradient-to-br from-blue-400 to-indigo-500 shadow-blue-300/50"
            }`}
          >
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          <div
            className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
              isDarkMode
                ? "bg-gradient-to-br from-cyan-500 to-purple-600"
                : "bg-gradient-to-br from-blue-400 to-indigo-500"
            }`}
          ></div>
        </div>
      </div>

      <h1
        className={`text-3xl font-bold text-center bg-clip-text text-transparent mb-2 ${
          isDarkMode ? "bg-gradient-to-r from-cyan-400 to-purple-400" : "bg-gradient-to-r from-blue-600 to-indigo-600"
        }`}
      >
        SMART HOME
      </h1>
      <p className={`text-center mb-6 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
        SISTEMA DE CONTROL AVANZADO
      </p>

      <form onSubmit={handleLogin} className="flex flex-col gap-5">
        <div className="relative">
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full p-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:shadow-lg ${
              isDarkMode
                ? "bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 focus:ring-cyan-400 focus:border-cyan-400 focus:shadow-cyan-400/25"
                : "bg-white/80 border-blue-200 text-gray-800 placeholder-gray-500 focus:ring-blue-400 focus:border-blue-400 focus:shadow-blue-200/25"
            }`}
          />
          <div
            className={`absolute inset-0 rounded-lg -z-10 opacity-0 focus-within:opacity-100 transition-opacity duration-300 ${
              isDarkMode
                ? "bg-gradient-to-r from-cyan-900/20 to-purple-900/20"
                : "bg-gradient-to-r from-blue-100/20 to-indigo-100/20"
            }`}
          ></div>
        </div>

        <div className="relative">
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:shadow-lg ${
              isDarkMode
                ? "bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 focus:ring-cyan-400 focus:border-cyan-400 focus:shadow-cyan-400/25"
                : "bg-white/80 border-blue-200 text-gray-800 placeholder-gray-500 focus:ring-blue-400 focus:border-blue-400 focus:shadow-blue-200/25"
            }`}
          />
          <div
            className={`absolute inset-0 rounded-lg -z-10 opacity-0 focus-within:opacity-100 transition-opacity duration-300 ${
              isDarkMode
                ? "bg-gradient-to-r from-cyan-900/20 to-purple-900/20"
                : "bg-gradient-to-r from-blue-100/20 to-indigo-100/20"
            }`}
          ></div>
        </div>

        {error && <p className="text-red-500 text-sm text-center animate-pulse">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className={`relative rounded-lg py-3 font-bold transition-all duration-300 shadow-lg hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden text-white ${
            isDarkMode
              ? "bg-gray-900 hover:bg-gray-800 shadow-cyan-500/25 hover:shadow-cyan-500/40 border border-cyan-500/30"
              : "bg-gray-900 hover:bg-gray-800 shadow-blue-300/25 hover:shadow-blue-300/40 border border-blue-500/30"
          }`}
          style={{ backgroundColor: "#111827" }}
        >
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          )}
          <span className="relative z-10 text-white font-bold tracking-wide drop-shadow-lg">
            {isLoading ? "AUTENTICANDO..." : "ACCEDER AL SISTEMA"}
          </span>
        </button>
      </form>

      <div className="text-center mt-4">
        <button 
          onClick={toggleForm}
          className={`transition-all duration-300 font-semibold text-sm ${
            isDarkMode
              ? "text-cyan-400 hover:text-cyan-300"
              : "text-blue-600 hover:text-blue-800"
          }`}
        >
          ¿No tienes una cuenta? Regístrate
        </button>
      </div>
    </div>
  )
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  useEffect(() => {
    const particles = document.querySelectorAll(".particle")
    particles.forEach((particle, index) => {
      const element = particle as HTMLElement
      element.style.animationDelay = `${index * 0.5}s`
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 1500))

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

    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Aquí iría la lógica de registro real (e.g., llamar a una API)
    console.log("Usuario registrado:", { username, password })

    setError("")
    setIsLoading(false)
    setIsRegistering(false) // Volver al login después del registro
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const toggleForm = () => {
    setIsRegistering(!isRegistering)
    setError("")
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center relative overflow-hidden ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-purple-900 to-black"
          : "bg-gradient-to-br from-blue-50 via-indigo-100 to-blue-50"
      }`}
    >
      <div className="absolute inset-0 opacity-70">
        <img
          src="/img/FondoLogin2.webp"
          alt="Smart Home Background"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="absolute inset-0 opacity-30">
        <div
          className={`absolute inset-0 ${
            isDarkMode
              ? "bg-gradient-to-r from-purple-900/20 to-cyan-900/20"
              : "bg-gradient-to-r from-blue-200/20 to-indigo-200/20"
          }`}
        ></div>
        <div className="grid grid-cols-20 grid-rows-20 w-full h-full">
          {Array.from({ length: 400 }).map((_, i) => (
            <div
              key={i}
              className={`border animate-pulse ${isDarkMode ? "border-cyan-500/30" : "border-blue-300/30"}`}
              style={{ animationDelay: `${i * 0.01}s` }}
            ></div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
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

      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 z-20 p-3 rounded-full transition-all duration-300 ${
          isDarkMode
            ? "bg-gray-800/80 hover:bg-gray-700/80 text-cyan-400"
            : "bg-white/80 hover:bg-white/90 text-blue-600"
        } backdrop-blur-sm shadow-lg hover:scale-110`}
      >
        {isDarkMode ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.59-1.591a.75.75 0 001.06 1.061l1.59 1.591z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" />
          </svg>
        )}
      </button>

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
          toggleForm={toggleForm}
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
          toggleForm={toggleForm}
        />
      )}
    </div>
  )
}

