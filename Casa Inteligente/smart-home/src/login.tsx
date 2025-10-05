"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Eye, EyeOff, User, Lock } from "lucide-react"

// -----------------
// Tipos de Props
// -----------------
interface LoginProps {
  onLogin: () => void
}

// -----------------
// Componentes de Iconos Flotantes
// -----------------
const FloatingIcons = () => {
  const icons = [
    { Icon: Lock, delay: '0s', color: 'text-blue-400/20', left: '15%', top: '20%' },
    { Icon: User, delay: '2s', color: 'text-indigo-400/20', left: '80%', top: '30%' },
    { Icon: Lock, delay: '4s', color: 'text-slate-400/20', left: '25%', top: '70%' },
    { Icon: User, delay: '6s', color: 'text-blue-300/20', left: '75%', top: '65%' },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map(({ Icon, delay, color, left, top }, i) => (
        <div
          key={i}
          className={`absolute ${color} animate-float-slow`}
          style={{
            left,
            top,
            animationDelay: delay,
          }}
        >
          <Icon size={40} />
        </div>
      ))}
    </div>
  )
}

// -----------------
// Transición de Puerta Mejorada
// -----------------
const DoorTransition = () => {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      <div className="relative w-full h-full" style={{ perspective: '1500px' }}>
        {/* Puerta Izquierda - Abre hacia afuera izquierda */}
        <div 
          className="absolute top-0 left-0 w-1/2 h-full origin-left animate-door-open-left"
          style={{
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f1420] via-[#1a1f35] to-[#141b2d] border-r-4 border-blue-500/40 shadow-[inset_0_0_80px_rgba(59,130,246,0.15),0_0_50px_rgba(59,130,246,0.2)]">
            {/* Grid de la puerta */}
            <div className="absolute inset-0 opacity-15" style={{
              backgroundImage: `
                linear-gradient(rgba(100,150,255,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(100,150,255,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }} />
            
            {/* Paneles decorativos */}
            <div className="absolute top-[15%] left-[10%] right-[15%] h-[30%] border-2 border-blue-400/20 rounded-lg" />
            <div className="absolute bottom-[15%] left-[10%] right-[15%] h-[30%] border-2 border-blue-400/20 rounded-lg" />
            
            {/* Manija de puerta */}
            <div className="absolute top-1/2 right-12 -translate-y-1/2">
              <div className="w-24 h-6 bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500 rounded-full shadow-[0_0_25px_rgba(59,130,246,0.6)]">
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-300 rounded-full shadow-[0_0_10px_rgba(147,197,253,0.8)]" />
              </div>
            </div>

            {/* Bisagras */}
            <div className="absolute left-2 top-[10%] w-4 h-8 bg-gradient-to-r from-slate-600 to-slate-500 rounded-sm shadow-lg" />
            <div className="absolute left-2 top-[50%] -translate-y-1/2 w-4 h-8 bg-gradient-to-r from-slate-600 to-slate-500 rounded-sm shadow-lg" />
            <div className="absolute left-2 bottom-[10%] w-4 h-8 bg-gradient-to-r from-slate-600 to-slate-500 rounded-sm shadow-lg" />
          </div>
        </div>
        
        {/* Puerta Derecha - Abre hacia afuera derecha */}
        <div 
          className="absolute top-0 right-0 w-1/2 h-full origin-right animate-door-open-right"
          style={{
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-[#0f1420] via-[#1a1f35] to-[#141b2d] border-l-4 border-purple-500/40 shadow-[inset_0_0_80px_rgba(139,92,246,0.15),0_0_50px_rgba(139,92,246,0.2)]">
            {/* Grid de la puerta */}
            <div className="absolute inset-0 opacity-15" style={{
              backgroundImage: `
                linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }} />
            
            {/* Paneles decorativos */}
            <div className="absolute top-[15%] left-[15%] right-[10%] h-[30%] border-2 border-purple-400/20 rounded-lg" />
            <div className="absolute bottom-[15%] left-[15%] right-[10%] h-[30%] border-2 border-purple-400/20 rounded-lg" />
            
            {/* Manija de puerta */}
            <div className="absolute top-1/2 left-12 -translate-y-1/2">
              <div className="w-24 h-6 bg-gradient-to-r from-purple-500 via-indigo-400 to-blue-500 rounded-full shadow-[0_0_25px_rgba(139,92,246,0.6)]">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-300 rounded-full shadow-[0_0_10px_rgba(196,181,253,0.8)]" />
              </div>
            </div>

            {/* Bisagras */}
            <div className="absolute right-2 top-[10%] w-4 h-8 bg-gradient-to-l from-slate-600 to-slate-500 rounded-sm shadow-lg" />
            <div className="absolute right-2 top-[50%] -translate-y-1/2 w-4 h-8 bg-gradient-to-l from-slate-600 to-slate-500 rounded-sm shadow-lg" />
            <div className="absolute right-2 bottom-[10%] w-4 h-8 bg-gradient-to-l from-slate-600 to-slate-500 rounded-sm shadow-lg" />
          </div>
        </div>

        {/* Luz que entra cuando se abre */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-400/50 via-white/30 to-purple-400/50 animate-light-reveal shadow-[0_0_100px_50px_rgba(255,255,255,0.3)]" />
        </div>
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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [showDoorTransition, setShowDoorTransition] = useState(false)

  // Tema automático (día/noche)
  useEffect(() => {
    const updateThemeByTime = () => {
      const hour = new Date().getHours()
      setIsDarkMode(hour < 6 || hour >= 18)
    }
    updateThemeByTime()
    const interval = setInterval(updateThemeByTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!username || !password) {
      setError("⚠ Por favor ingrese usuario y contraseña")
      return
    }
    
    setIsLoading(true)
    setError("")
    
    // Simulación de autenticación
    await new Promise((r) => setTimeout(r, 2500))
    
    if (username === "admin" && password === "1234") {
      // Mostrar transición de puerta
      setShowDoorTransition(true)
      
      // Esperar a que termine la animación antes de cambiar a dashboard
      setTimeout(() => {
        onLogin()
      }, 2500)
    } else {
      setError("⌀ Usuario o contraseña incorrectos")
      setIsLoading(false)
    }
  }

  // Manejar Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin()
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&family=Exo+2:wght@300;600&display=swap');
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0%; }
          100% { background-position: 200% 0%; }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.15; }
          25% { transform: translate(80px, -120px) rotate(45deg); opacity: 0.25; }
          50% { transform: translate(-60px, -80px) rotate(90deg); opacity: 0.2; }
          75% { transform: translate(100px, 60px) rotate(135deg); opacity: 0.3; }
        }
        @keyframes particleRise {
          0% { transform: translateY(100vh) translateX(0) scale(1); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100vh) translateX(50px) scale(0.5); opacity: 0; }
        }
        @keyframes doorOpenLeft {
          0% { 
            transform: perspective(1500px) rotateY(0deg);
            opacity: 1;
          }
          100% { 
            transform: perspective(1500px) rotateY(-110deg);
            opacity: 0.3;
          }
        }
        @keyframes doorOpenRight {
          0% { 
            transform: perspective(1500px) rotateY(0deg);
            opacity: 1;
          }
          100% { 
            transform: perspective(1500px) rotateY(110deg);
            opacity: 0.3;
          }
        }
        @keyframes lightReveal {
          0% { 
            opacity: 0;
            transform: translateX(-50%) scaleY(0);
          }
          50% { 
            opacity: 1;
          }
          100% { 
            opacity: 1;
            transform: translateX(-50%) scaleY(1);
          }
        }
        @keyframes gridMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
        
        .animate-slideIn { animation: slideIn 1s ease-out; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 3s linear infinite; }
        .animate-float-slow { animation: floatSlow 30s infinite ease-in-out; }
        .animate-particle-rise { animation: particleRise 25s infinite; }
        .animate-door-open-left { 
          animation: doorOpenLeft 2.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        .animate-door-open-right { 
          animation: doorOpenRight 2.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        .animate-light-reveal {
          animation: lightReveal 2.5s ease-out forwards;
        }
        .animate-grid-move { animation: gridMove 20s linear infinite; }
      `}</style>

      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-black">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#141b2d] to-[#1a1f35]" />
          
          <div className="absolute inset-0 opacity-10 animate-grid-move">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(100,150,255,0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(100,150,255,0.15) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }} />
          </div>

          <div className="absolute inset-0">
            <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-slate-500/5 rounded-full blur-[100px]" />
          </div>

          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-[20%] w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
            <div className="absolute top-[40%] w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
            <div className="absolute top-[60%] w-full h-[1px] bg-gradient-to-r from-transparent via-slate-400/40 to-transparent" />
            <div className="absolute top-[80%] w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          </div>

          <FloatingIcons />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-particle-rise"
                style={{
                  left: `${Math.random() * 100}%`,
                  width: `${1 + Math.random() * 2}px`,
                  height: `${1 + Math.random() * 2}px`,
                  background: i % 2 === 0 ? 'rgba(100,150,255,0.4)' : 'rgba(200,200,255,0.3)',
                  boxShadow: `0 0 ${3 + Math.random() * 5}px currentColor`,
                  animationDelay: `${Math.random() * 25}s`,
                  animationDuration: `${20 + Math.random() * 15}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Formulario de Login */}
        {!showDoorTransition && (
          <div className="relative z-10 flex items-center justify-center min-h-screen p-5">
            <div className="relative z-10 w-full max-w-md bg-[#0f1420]/95 backdrop-blur-xl rounded-3xl p-12 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-slate-700/50 overflow-hidden animate-slideIn">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5" />
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="text-center mb-10">
                  <div className="text-7xl mb-4 animate-float filter drop-shadow-[0_0_20px_rgba(100,150,255,0.4)]">
                    🏠
                  </div>
                  <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-slate-300 bg-clip-text text-transparent tracking-[0.3em] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    SMART HOME
                  </h1>
                  <p className="text-slate-400 tracking-[0.25em] text-sm" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                    Control System v4.0
                  </p>
                </div>

                <div className="space-y-6" onKeyPress={handleKeyPress}>
                  <div>
                    <label className="block text-blue-300 text-xs font-medium tracking-widest mb-2 uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      Usuario
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="Ingrese su usuario"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-5 py-4 pr-12 bg-slate-900/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Rajdhani, sans-serif' }}
                      />
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors" size={20} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-blue-300 text-xs font-medium tracking-widest mb-2 uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      Contraseña
                    </label>
                    <div className="relative group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Ingrese su contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-5 py-4 pr-12 bg-slate-900/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:border-indigo-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Rajdhani, sans-serif' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors disabled:cursor-not-allowed"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm text-center animate-pulse">{error}</p>
                  )}

                  <button
                    onClick={() => handleLogin()}
                    disabled={isLoading}
                    className="relative w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl text-white font-bold text-lg tracking-[0.2em] uppercase overflow-hidden group disabled:cursor-not-allowed disabled:opacity-90 mt-6 transition-all shadow-lg hover:shadow-blue-500/20"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    
                    <span className="relative z-10">
                      {!isLoading ? (
                        'Acceder'
                      ) : (
                        <span className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Autenticando...
                        </span>
                      )}
                    </span>

                    {isLoading && (
                      <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 bg-[length:200%_100%] animate-shimmer w-full rounded-b-2xl" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transición de Puerta */}
        {showDoorTransition && <DoorTransition />}
      </div>
    </>
  )
}