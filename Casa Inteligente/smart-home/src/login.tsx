"use client"

import type React from "react"

import { useState, useEffect } from "react"

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10"></div>
        <div className="grid grid-cols-20 grid-rows-20 w-full h-full">
          {Array.from({ length: 400 }).map((_, i) => (
            <div
              key={i}
              className="border border-cyan-500/20 animate-pulse"
              style={{ animationDelay: `${i * 0.01}s` }}
            ></div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="particle absolute w-1 h-1 bg-cyan-400 rounded-full animate-bounce opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 w-96 bg-black/40 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-cyan-500/25 hover:shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl -z-10"></div>

        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
          SMART HOME
        </h1>
        <p className="text-gray-300 text-center mb-6 text-sm">SISTEMA DE CONTROL AVANZADO</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="relative">
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-lg bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 focus:shadow-lg focus:shadow-cyan-500/25"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg -z-10 opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-black/50 border border-cyan-500/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300 focus:shadow-lg focus:shadow-cyan-500/25"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg -z-10 opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
          </div>

          {error && <p className="text-red-400 text-sm text-center animate-pulse">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="relative bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-lg py-3 font-bold transition-all duration-300 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
          >
            {isLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            )}
            <span className="relative z-10">{isLoading ? "AUTENTICANDO..." : "ACCEDER AL SISTEMA"}</span>
          </button>
        </form>

        <div className="mt-6 p-3 bg-black/30 rounded-lg border border-cyan-500/20">
          <p className="text-gray-300 text-xs text-center">
            <span className="text-cyan-400">Usuario:</span> <span className="font-mono text-white">admin</span> |
            <span className="text-cyan-400"> Contraseña:</span> <span className="font-mono text-white">1234</span>
          </p>
        </div>
      </div>
    </div>
  )
}
