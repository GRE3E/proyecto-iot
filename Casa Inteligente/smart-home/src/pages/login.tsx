// src/pages/Login.tsx
"use client";

import React from "react";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { useLogin } from "../hooks/useLogin";
import { useAuth } from "../hooks/useAuth";
import { useThemeByTime } from "../hooks/useThemeByTime"; // lo usamos para pasar el theme a la transición
import "../styles/animations.css"; // Asegúrate que la ruta coincide con tu estilo global

// Props del page-level (puedes pasar onLogin desde App)
interface LoginProps {
  onLogin: () => void;
  onStartZoom?: () => void;
}

const FloatingIcons: React.FC = () => {
  const icons = [
    { Icon: Lock, delay: "0s", color: "text-blue-400/20", left: "15%", top: "20%" },
    { Icon: User, delay: "2s", color: "text-indigo-400/20", left: "80%", top: "30%" },
    { Icon: Lock, delay: "4s", color: "text-slate-400/20", left: "25%", top: "70%" },
    { Icon: User, delay: "6s", color: "text-blue-300/20", left: "75%", top: "65%" },
  ];

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
  );
};

const DoorTransition: React.FC<{ theme: "day" | "afternoon" | "night" }> = ({ theme }) => {
  // Los estilos de color se mantienen simples y en CSS/inline como antes
  const themeBackground =
    theme === "day"
      ? "linear-gradient(180deg, rgba(6,30,60,0.95) 0%, rgba(4,20,40,0.95) 100%)"
      : theme === "afternoon"
      ? "linear-gradient(180deg, rgba(45,20,6,0.95) 0%, rgba(30,12,4,0.95) 100%)"
      : "linear-gradient(180deg, rgba(8,4,20,0.95) 0%, rgba(15,6,40,0.95) 100%)";

  const lightGradient =
    theme === "day"
      ? "linear-gradient(180deg, rgba(110,231,255,0.95), rgba(37,99,235,0.9))"
      : theme === "afternoon"
      ? "linear-gradient(180deg, rgba(255,196,77,0.95), rgba(245,158,11,0.9))"
      : "linear-gradient(180deg, rgba(165,180,252,0.95), rgba(139,92,246,0.9))";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <div className="absolute inset-0" style={{ background: themeBackground, filter: "blur(14px)", opacity: 0.9, transform: "scale(1.02)" }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ width: 260, height: 420, background: lightGradient, filter: "blur(100px)", opacity: 0.65, borderRadius: 999 }} className="animate-light-reveal" />
      </div>

      <div className="absolute inset-0" style={{ perspective: "2000px" }}>
        <div className="absolute left-0 top-0 w-1/2 h-full origin-left animate-door-open-left" style={{ transformStyle: "preserve-3d" }}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#071022] via-[#0d1424] to-[#0f1b37] shadow-[inset_-60px_0_120px_rgba(0,120,255,0.12)]" />
          <div className="absolute right-0 top-0 w-[14px] h-full" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.2))" }} />
          <div className="absolute right-[6%] top-1/2 -translate-y-1/2 w-[10px] h-[60px] rounded-full" style={{ background: "linear-gradient(180deg, #cfcfcf, #7d7d7d)" }} />
          <div className="absolute left-0 top-[20%] w-[8px] h-[36px] rounded-r-md" style={{ background: "linear-gradient(180deg,#4b5563,#111827)" }} />
          <div className="absolute left-0 top-[50%] w-[8px] h-[36px] rounded-r-md" style={{ background: "linear-gradient(180deg,#4b5563,#111827)" }} />
          <div className="absolute left-0 top-[80%] w-[8px] h-[36px] rounded-r-md" style={{ background: "linear-gradient(180deg,#4b5563,#111827)" }} />
        </div>

        <div className="absolute right-0 top-0 w-1/2 h-full origin-right animate-door-open-right" style={{ transformStyle: "preserve-3d" }}>
          <div className="absolute inset-0 bg-gradient-to-l from-[#071022] via-[#0d1424] to-[#0f1b37] shadow-[inset_60px_0_120px_rgba(130,60,255,0.08)]" />
          <div className="absolute left-0 top-0 w-[14px] h-full" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.2))" }} />
          <div className="absolute left-[6%] top-1/2 -translate-y-1/2 w-[10px] h-[60px] rounded-full" style={{ background: "linear-gradient(180deg, #cfcfcf, #7d7d7d)" }} />
          <div className="absolute right-0 top-[20%] w-[8px] h-[36px] rounded-l-md" style={{ background: "linear-gradient(180deg,#4b5563,#111827)" }} />
          <div className="absolute right-0 top-[50%] w-[8px] h-[36px] rounded-l-md" style={{ background: "linear-gradient(180deg,#4b5563,#111827)" }} />
          <div className="absolute right-0 top-[80%] w-[8px] h-[36px] rounded-l-md" style={{ background: "linear-gradient(180deg,#4b5563,#111827)" }} />
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ width: 10, height: "75%", background: lightGradient, filter: "blur(24px)", opacity: 0.85 }} className="animate-light-pulse" />
      </div>
    </div>
  );
};

export default function Login({ onLogin}: LoginProps) {
  const { login } = useAuth();
  const {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    isLoading,
    showDoorTransition,
    handleLogin,
    handleKeyPress,
  } = useLogin(onLogin, login);

  const { theme: themeByTime } = useThemeByTime();

  // wrapper que pasa callbacks del page
  const doLogin = () => handleLogin();

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-black">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#141b2d] to-[#1a1f35]" />
          <div className="absolute inset-0 opacity-10 animate-grid-move">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(rgba(100,150,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(100,150,255,0.15) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
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
              <div key={i} className="absolute rounded-full animate-particle-rise"
                style={{
                  left: `${Math.random() * 100}%`,
                  width: `${1 + Math.random() * 2}px`,
                  height: `${1 + Math.random() * 2}px`,
                  background: i % 2 === 0 ? "rgba(100,150,255,0.4)" : "rgba(200,200,255,0.3)",
                  boxShadow: `0 0 ${3 + Math.random() * 5}px currentColor`,
                  animationDelay: `${Math.random() * 25}s`,
                  animationDuration: `${20 + Math.random() * 15}s`,
                }} />
            ))}
          </div>
        </div>

        {!showDoorTransition && (
          <div className="relative z-10 flex items-center justify-center min-h-screen p-5 login-overlay">
            <div className="relative z-10 w-full max-w-md bg-[#0f1420]/95 backdrop-blur-xl rounded-3xl p-12 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-slate-700/50 overflow-hidden animate-slideIn">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5" />
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />

              <div className="relative z-10">
                <div className="text-center mb-10">
                  <div className="text-7xl mb-4 animate-float filter drop-shadow-[0_0_20px_rgba(100,150,255,0.4)]">🏠</div>
                  <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-slate-300 bg-clip-text text-transparent tracking-[0.3em] mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
                    SMART HOME
                  </h1>
                  <p className="text-slate-400 tracking-[0.25em] text-sm" style={{ fontFamily: "Exo 2, sans-serif" }}>
                    Control System v4.0
                  </p>
                </div>

                <div className="space-y-6" onKeyDown={handleKeyPress}>
                  <div>
                    <label className="block text-blue-300 text-xs font-medium tracking-widest mb-2 uppercase" style={{ fontFamily: "Rajdhani, sans-serif" }}>
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
                        style={{ fontFamily: "Rajdhani, sans-serif" }}
                      />
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors" size={20} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-blue-300 text-xs font-medium tracking-widest mb-2 uppercase" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                      Contraseña
                    </label>
                    <div className="relative group">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Ingrese su contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-5 py-4 pr-12 bg-slate-900/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:border-indigo-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ fontFamily: "Rajdhani, sans-serif" }}
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

                  {error && <p className="text-red-400 text-sm text-center animate-pulse">{error}</p>}

                  <button
                    onClick={doLogin}
                    disabled={isLoading}
                    className="relative w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl text-white font-bold text-lg tracking-[0.2em] uppercase overflow-hidden group disabled:cursor-not-allowed disabled:opacity-90 mt-6 transition-all shadow-lg hover:shadow-blue-500/20"
                    style={{ fontFamily: "Orbitron, sans-serif" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative z-10">
                      {!isLoading ? "Acceder" : (
                        <span className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Autenticando...
                        </span>
                      )}
                    </span>
                    {isLoading && <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 bg-[length:200%_100%] animate-shimmer w-full rounded-b-2xl" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDoorTransition && <DoorTransition theme={themeByTime as any} />}
      </div>
    </>
  );
}
