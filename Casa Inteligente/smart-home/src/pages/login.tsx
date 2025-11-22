"use client";

import React, { useRef } from "react";
import { Eye, EyeOff, User, HouseWifi } from "lucide-react";
import { useLogin } from "../hooks/useLogin";
import { useThemeByTime } from "../hooks/useThemeByTime";
import { useAuth } from "../hooks/useAuth";
import "../styles/animations.css";
import FloatingIcons from "../components/effects/FloatingIcons";

const DoorTransition: React.FC<{ theme: "dark" | "light" }> = ({ theme }) => {
  const themeBackground =
    theme === "light"
      ? "linear-gradient(180deg, rgba(240,244,250,0.95) 0%, rgba(230,236,245,0.95) 100%)"
      : "linear-gradient(180deg, rgba(8,12,24,0.95) 0%, rgba(6,10,20,0.95) 100%)";

  const lightGradient =
    theme === "light"
      ? "linear-gradient(180deg, rgba(180,200,255,0.95), rgba(140,180,255,0.9))"
      : "linear-gradient(180deg, rgba(165,180,252,0.95), rgba(139,92,246,0.9))";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background: themeBackground,
          filter: "blur(14px)",
          opacity: 0.9,
          transform: "scale(1.02)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          style={{
            width: 260,
            height: 420,
            background: lightGradient,
            filter: "blur(100px)",
            opacity: 0.65,
            borderRadius: 999,
          }}
          className="animate-light-reveal"
        />
      </div>

      <div className="absolute inset-0" style={{ perspective: "2000px" }}>
        <div
          className="absolute left-0 top-0 w-1/2 h-full origin-left animate-door-open-left"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#071022] via-[#0d1424] to-[#0f1b37] shadow-[inset_-60px_0_120px_rgba(0,120,255,0.12)]" />
          <div className="absolute right-[6%] top-1/2 -translate-y-1/2 w-[10px] h-[60px] rounded-full bg-gradient-to-b from-gray-200 to-gray-500" />
        </div>
        <div
          className="absolute right-0 top-0 w-1/2 h-full origin-right animate-door-open-right"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-[#071022] via-[#0d1424] to-[#0f1b37] shadow-[inset_60px_0_120px_rgba(130,60,255,0.08)]" />
          <div className="absolute left-[6%] top-1/2 -translate-y-1/2 w-[10px] h-[60px] rounded-full bg-gradient-to-b from-gray-200 to-gray-500" />
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          style={{
            width: 10,
            height: "75%",
            background: lightGradient,
            filter: "blur(24px)",
            opacity: 0.85,
          }}
          className="animate-light-pulse"
        />
      </div>
    </div>
  );
};

interface LoginProps {
  onNavigate?: (section: string) => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const { login: authLogin } = useAuth();
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
  } = useLogin();

  const { theme: themeByTime } = useThemeByTime();
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setUsername(e.target.value);
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPassword(e.target.value);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) =>
    handleKeyPress(e);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const doLogin = () => handleLogin();

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#141b2d] to-[#1a1f35]" />
        <FloatingIcons />
      </div>

      {!showDoorTransition && (
        <div className="relative z-10 w-full min-h-screen flex items-center justify-center px-3 xs:px-4 sm:px-6 py-6 xs:py-8 sm:py-12 md:py-16">
          <div className="w-full max-w-sm bg-[#0f1420]/95 backdrop-blur-xl rounded-2xl md:rounded-3xl p-5 xs:p-6 sm:p-8 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-slate-700/50 overflow-hidden animate-slideIn">
            
            {/* Header */}
            <div className="text-center mb-6 xs:mb-7 sm:mb-8 md:mb-10">
              <div className="mb-3 xs:mb-4 sm:mb-5 md:mb-6 animate-float">
                <HouseWifi
                  size={48}
                  className="mx-auto text-blue-400 drop-shadow-[0_0_25px_rgba(100,150,255,0.6)] transition-all duration-700 hover:scale-105 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-[68px] md:h-[68px]"
                />
              </div>
              <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-slate-300 bg-clip-text text-transparent tracking-wider font-['Rajdhani'] leading-tight">
                SMART HOME
              </h1>
            </div>

            {/* Form */}
            <form className="space-y-4 xs:space-y-5 sm:space-y-6" onSubmit={(e) => { e.preventDefault(); doLogin(); }}>
              {/* Username */}
              <div>
                <label
                  className="block text-xs xs:text-sm md:text-base font-semibold tracking-wide mb-1.5 xs:mb-2 bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(90,160,255,0.3)]"
                  style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.08em" }}
                >
                  Usuario
                </label>
                <div className="relative group">
                  <input
                    ref={usernameRef}
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ingrese su usuario"
                    disabled={isLoading}
                    className="w-full px-3 xs:px-4 sm:px-5 py-2.5 xs:py-3 sm:py-4 pr-10 xs:pr-12 bg-slate-900/50 border border-slate-700/50 rounded-lg xs:rounded-xl sm:rounded-2xl text-xs xs:text-sm sm:text-base text-white placeholder-slate-500 focus:border-blue-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <User
                    className="absolute right-3 xs:right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors"
                    size={16}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-xs xs:text-sm md:text-base font-semibold tracking-wide mb-1.5 xs:mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(120,100,255,0.35)]"
                  style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.08em" }}
                >
                  Contraseña
                </label>
                <div className="relative group">
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ingrese su contraseña"
                    disabled={isLoading}
                    className="w-full px-3 xs:px-4 sm:px-5 py-2.5 xs:py-3 sm:py-4 pr-10 xs:pr-12 bg-slate-900/50 border border-slate-700/50 rounded-lg xs:rounded-xl sm:rounded-2xl text-xs xs:text-sm sm:text-base text-white placeholder-slate-500 focus:border-indigo-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    disabled={isLoading}
                    className="absolute right-3 xs:right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors p-1 disabled:cursor-not-allowed"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg xs:rounded-xl p-2 xs:p-3 animate-pulse">
                  <p className="text-red-400 text-xs xs:text-sm text-center">
                    {error}
                  </p>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                onClick={doLogin}
                disabled={isLoading}
                className="relative w-full py-3 xs:py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-600/50 disabled:to-indigo-600/50 rounded-lg xs:rounded-xl sm:rounded-2xl text-white font-bold text-xs xs:text-sm sm:text-base md:text-lg tracking-[0.2em] uppercase overflow-hidden group mt-6 xs:mt-7 sm:mt-8 transition-all shadow-lg hover:shadow-blue-500/20 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10 flex items-center justify-center">
                  {!isLoading ? (
                    "Acceder"
                  ) : (
                    <span className="flex items-center justify-center gap-2 xs:gap-3">
                      <div className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Autenticando...</span>
                    </span>
                  )}
                </span>
              </button>

              {/* Forgot Password Link */}
              <button
                type="button"
                onClick={() => onNavigate?.("Recuperar Contraseña")}
                disabled={isLoading}
                className="w-full text-center text-xs xs:text-sm text-slate-400 hover:text-blue-400 transition-colors mt-3 xs:mt-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          </div>
        </div>
      )}

      {showDoorTransition && <DoorTransition theme={themeByTime as any} />}
    </div>
  );
}