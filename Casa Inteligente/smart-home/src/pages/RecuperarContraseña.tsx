"use client";
import { User, Camera, Mic, Lock, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { useRecuperarContra } from "../hooks/useRecuperarContra";

export default function RecuperarContraseña() {
  const {
    // Estados principales
    step,
    username,
    setUsername,
    recoveryMethod,
    setRecoveryMethod,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,

    // Estados de UI
    loading,
    error,
    setError,
    success,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,

    // Estados biométricos
    biometricLoading,
    biometricStatus,
    videoRef,

    // Funciones
    handleValidateUsername,
    startFacialRecognition,
    startVoiceRecognition,
    handleChangePassword,
    resetProcess,
    changeBiometricMethod,
  } = useRecuperarContra();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 mt-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-slate-300 bg-clip-text text-transparent mb-2">
            Cambiar Contraseña
          </h1>
          <p className="text-slate-400 text-sm">Sigue los pasos para recuperar tu acceso</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all ${
                s <= step ? "bg-blue-500" : "bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Card Container */}
        <div className="bg-[#0f1420]/95 backdrop-blur-xl rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-slate-700/50">
          {/* STEP 1: Validar Usuario */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Paso 1: Verifica tu usuario</h2>

              <div>
                <label className="block text-sm font-semibold text-blue-400 mb-2">
                  Nombre de usuario
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError("");
                    }}
                    placeholder="Ingresa tu usuario"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50"
                  />
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </div>
              </div>

              {error && (
                <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              <button
                onClick={handleValidateUsername}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-600/50 disabled:to-indigo-600/50 rounded-lg text-white font-bold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Validando...
                  </>
                ) : (
                  "Validar Usuario"
                )}
              </button>
            </div>
          )}

          {/* STEP 2: Reconocimiento Biométrico */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Paso 2: Verifica tu identidad</h2>

              {!recoveryMethod ? (
                <>
                  <p className="text-slate-400 text-sm">
                    Selecciona el método de verificación:
                  </p>

                  {/* Facial Recognition Button */}
                  <button
                    onClick={() => {
                      setRecoveryMethod("face");
                      startFacialRecognition();
                    }}
                    disabled={biometricLoading}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 hover:border-blue-400/60 rounded-lg transition-all hover:bg-gradient-to-r hover:from-blue-600/30 hover:to-cyan-600/30 disabled:opacity-50"
                  >
                    <div className="p-3 bg-blue-600/30 rounded-lg">
                      <Camera className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-white text-sm">
                        Reconocimiento Facial
                      </h4>
                      <p className="text-xs text-slate-400">Usa tu cámara para verificar</p>
                    </div>
                  </button>

                  {/* Voice Recognition Button */}
                  <button
                    onClick={() => {
                      setRecoveryMethod("voice");
                      startVoiceRecognition();
                    }}
                    disabled={biometricLoading}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 hover:border-purple-400/60 rounded-lg transition-all hover:bg-gradient-to-r hover:from-purple-600/30 hover:to-indigo-600/30 disabled:opacity-50"
                  >
                    <div className="p-3 bg-purple-600/30 rounded-lg">
                      <Mic className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-white text-sm">
                        Reconocimiento de Voz
                      </h4>
                      <p className="text-xs text-slate-400">Usa tu micrófono para verificar</p>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  {/* Video Feed for Facial Recognition */}
                  {recoveryMethod === "face" && (
                    <div className="space-y-4">
                      <video
                        ref={videoRef}
                        className="w-full rounded-lg bg-black"
                        style={{ maxHeight: "300px" }}
                      />
                    </div>
                  )}

                  {/* Status Message */}
                  <div className="flex items-center gap-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    {biometricLoading ? (
                      <Loader size={18} className="text-blue-400 animate-spin flex-shrink-0" />
                    ) : (
                      <CheckCircle size={18} className="text-blue-400 flex-shrink-0" />
                    )}
                    <p className="text-blue-400 text-sm">{biometricStatus}</p>
                  </div>

                  {error && (
                    <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={changeBiometricMethod}
                    disabled={biometricLoading}
                    className="w-full py-2 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    Cambiar método
                  </button>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Nueva Contraseña */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Paso 3: Nueva contraseña</h2>

              {/* Nueva Contraseña */}
              <div>
                <label className="block text-sm font-semibold text-blue-400 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Mínimo 8 caracteres"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400"
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label className="block text-sm font-semibold text-indigo-400 mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Confirma tu contraseña"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400"
                  >
                    {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-green-600/50 disabled:to-emerald-600/50 rounded-lg text-white font-bold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Cambiando contraseña...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Cambiar Contraseña
                  </>
                )}
              </button>
            </div>
          )}

          {/* Reset Button */}
          {step > 1 && (
            <button
              onClick={resetProcess}
              className="w-full mt-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              Comenzar de nuevo
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          ¿Recordaste tu contraseña?{" "}
          <a href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
            Volver al login
          </a>
        </p>
      </div>
    </div>
  );
}