"use client";

import React, { useRef } from "react";
import { Eye, EyeOff, User, HouseWifi, XCircle } from "lucide-react";
import { useLogin } from "../hooks/useLogin";

import "../styles/animations.css";
import FloatingIcons from "../components/effects/FloatingIcons";

interface LoginProps {
  onNavigate?: (section: string) => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    isLoading,
    handleLogin,
    handleKeyPress,
    showErrorModal,
  } = useLogin();

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, "");
    setUsername(value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, "");
    setPassword(value);
  };
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
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center px-0 py-0 md:px-5 md:py-6">
        <div className="w-full h-screen md:h-auto md:max-w-[400px] bg-[#0f1420]/95 backdrop-blur-xl rounded-none md:rounded-2xl p-8 md:p-8 shadow-none md:shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-0 md:border md:border-slate-700/50 overflow-hidden animate-slideIn flex flex-col justify-center">
          {/* Header */}
          <div className="text-center mb-8 md:mb-7">
            <div className="mb-6 md:mb-5 animate-float">
              <HouseWifi
                size={64}
                className="mx-auto text-blue-400 drop-shadow-[0_0_25px_rgba(100,150,255,0.6)] transition-all duration-700 hover:scale-105 md:w-14 md:h-14"
              />
            </div>
            <h1 className="text-[36px] md:text-[34px] font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-slate-300 bg-clip-text text-transparent tracking-wider font-['Rajdhani'] leading-tight">
              SMART HOME
            </h1>
          </div>

          {/* Form */}
          <form
            className="space-y-6 md:space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              doLogin();
            }}
          >
            {/* Username */}
            <div>
              <label
                className="block text-[16px] md:text-[16px] font-semibold tracking-wide mb-3 md:mb-2.5 bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(90,160,255,0.3)]"
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  letterSpacing: "0.08em",
                }}
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
                  className="w-full px-5 py-4 md:py-3.5 pr-12 bg-slate-900/50 border border-slate-700/50 rounded-xl text-[16px] md:text-[16px] text-white placeholder-slate-500 focus:border-blue-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <User
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors"
                  size={22}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-[16px] md:text-[16px] font-semibold tracking-wide mb-3 md:mb-2.5 bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(120,100,255,0.35)]"
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  letterSpacing: "0.08em",
                }}
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
                  className="w-full px-5 py-4 md:py-3.5 pr-12 bg-slate-900/50 border border-slate-700/50 rounded-xl text-[16px] md:text-[16px] text-white placeholder-slate-500 focus:border-indigo-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors p-1 disabled:cursor-not-allowed"
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full py-4.5 md:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-600/50 disabled:to-indigo-600/50 rounded-xl text-white font-bold text-[16px] md:text-[16px] tracking-[0.2em] uppercase overflow-hidden group mt-8 md:mt-7 transition-all shadow-lg hover:shadow-blue-500/20 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative z-10 flex items-center justify-center">
                {!isLoading ? (
                  "Acceder"
                ) : (
                  <span className="flex items-center justify-center gap-2.5">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
              className="w-full text-center text-[15px] md:text-[15px] text-slate-400 hover:text-blue-400 transition-colors mt-5 md:mt-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        </div>
      </div>
      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-[#0f1420] rounded-2xl p-6 shadow-lg border border-slate-700/50 max-w-sm w-full text-center animate-shake">
            <XCircle size={48} className="mx-auto text-red-500 mb-4" />
            <p className="text-red-400 text-lg font-semibold mb-2">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}