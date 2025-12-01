"use client";
import {
  Camera,
  Mic,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader,
} from "lucide-react";
import { useRecuperarContra } from "../hooks/useRecuperarContra";
import FloatingIcons from "../components/effects/FloatingIcons";

export default function RecuperarContraseña() {
  const {
    // Estados principales
    step,
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
    voiceTranscript,
    videoRef,
    availableCameras,
    selectedCameraId,
    updateSelectedCamera,

    // Funciones
    startFacialRecognition,
    startVoiceRecognition,
    handleChangePassword,
    resetProcess,
    changeBiometricMethod,
    isRecording,
    beginVoiceRecording,
    stopVoiceRecording,
    voiceReady,
  } = useRecuperarContra();

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      {/* Background - igual que login.tsx */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#141b2d] to-[#1a1f35]" />
        <FloatingIcons />
      </div>

      <div className="relative z-10 w-full min-h-screen flex items-center justify-center px-3 xs:px-4 sm:px-6 py-6 xs:py-8 sm:py-12 md:py-16">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-6 xs:mb-8">
            <h1 className="text-3xl xs:text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-slate-300 bg-clip-text text-transparent tracking-wider font-['Rajdhani'] mb-2">
              CAMBIAR CONTRASEÑA
            </h1>
            <p className="text-slate-400 text-sm xs:text-base">
              Sigue los pasos para recuperar tu acceso
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-6 xs:mb-8 max-w-md mx-auto">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-blue-500" : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Card Container - mismos estilos que login.tsx */}
          <div className="bg-[#0f1420]/95 backdrop-blur-xl rounded-2xl md:rounded-3xl p-5 xs:p-6 sm:p-8 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-slate-700/50 overflow-hidden animate-slideIn">
            {/* STEP 1: Reconocimiento Biométrico */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl xs:text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
                  Paso 1: Verifica tu identidad
                </h2>

                {!recoveryMethod ? (
                  <>
                    <p className="text-slate-400 text-sm xs:text-base">
                      Selecciona el método de verificación:
                    </p>

                    {/* Facial Recognition Button */}
                    <button
                      onClick={() => {
                        setRecoveryMethod("face");
                        startFacialRecognition();
                      }}
                      disabled={biometricLoading}
                      className="w-full flex items-center gap-4 p-4 xs:p-5 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 hover:border-blue-400/60 rounded-lg xs:rounded-xl transition-all hover:bg-gradient-to-r hover:from-blue-600/30 hover:to-cyan-600/30 disabled:opacity-50 group"
                    >
                      <div className="p-3 bg-blue-600/30 rounded-lg group-hover:bg-blue-600/40 transition-all">
                        <Camera className="w-6 h-6 xs:w-7 xs:h-7 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-white text-sm xs:text-base">
                          Reconocimiento Facial
                        </h4>
                        <p className="text-xs xs:text-sm text-slate-400">
                          Usa tu cámara para verificar
                        </p>
                      </div>
                    </button>

                    {/* Voice Recognition Button */}
                    <button
                      onClick={() => {
                        setRecoveryMethod("voice");
                        startVoiceRecognition();
                      }}
                      disabled={biometricLoading}
                      className="w-full flex items-center gap-4 p-4 xs:p-5 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 hover:border-purple-400/60 rounded-lg xs:rounded-xl transition-all hover:bg-gradient-to-r hover:from-purple-600/30 hover:to-indigo-600/30 disabled:opacity-50 group"
                    >
                      <div className="p-3 bg-purple-600/30 rounded-lg group-hover:bg-purple-600/40 transition-all">
                        <Mic className="w-6 h-6 xs:w-7 xs:h-7 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-white text-sm xs:text-base">
                          Reconocimiento de Voz
                        </h4>
                        <p className="text-xs xs:text-sm text-slate-400">
                          Usa tu micrófono para verificar
                        </p>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Status Messages */}
                    {recoveryMethod === "voice" && (
                      <div className="flex items-center gap-2 p-3 xs:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg xs:rounded-xl">
                        {biometricLoading ? (
                          <Loader
                            size={18}
                            className="text-blue-400 animate-spin flex-shrink-0"
                          />
                        ) : (
                          <CheckCircle
                            size={18}
                            className="text-blue-400 flex-shrink-0"
                          />
                        )}
                        <p className="text-blue-400 text-xs xs:text-sm">
                          {biometricStatus}
                        </p>
                      </div>
                    )}

                    {recoveryMethod === "voice" && voiceTranscript && (
                      <p className="text-center text-purple-300 text-xs xs:text-sm italic mt-2">
                        Detectado: "{voiceTranscript}"
                      </p>
                    )}

                    {error && (
                      <div className="flex gap-2 p-3 xs:p-4 bg-red-500/10 border border-red-500/30 rounded-lg xs:rounded-xl animate-pulse">
                        <AlertCircle
                          size={18}
                          className="text-red-400 flex-shrink-0 mt-0.5"
                        />
                        <p className="text-red-400 text-xs xs:text-sm">
                          {error}
                        </p>
                      </div>
                    )}

                    {recoveryMethod === "voice" && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <p className="text-center text-slate-300 text-sm">
                            Di la siguiente frase para verificar tu identidad:
                          </p>
                          <p className="text-center text-blue-400 font-semibold text-base">
                            "Murphy soy parte del hogar"
                          </p>
                          <button
                            onClick={() =>
                              isRecording
                                ? stopVoiceRecording()
                                : beginVoiceRecording()
                            }
                            className={`w-full flex items-center gap-3 p-3 xs:p-4 rounded-lg xs:rounded-xl transition-all border ${
                              isRecording
                                ? "bg-red-600/20 border-red-500/40 hover:border-red-400/70"
                                : "bg-purple-600/20 border-purple-500/40 hover:border-purple-400/70"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-lg ${
                                isRecording
                                  ? "bg-red-600/30"
                                  : "bg-purple-600/30"
                              }`}
                            >
                              <Mic
                                className={`w-5 h-5 ${
                                  isRecording
                                    ? "text-red-400"
                                    : "text-purple-400"
                                }`}
                              />
                            </div>
                            <span className="text-sm xs:text-base text-white font-semibold">
                              {isRecording
                                ? "Detener grabación"
                                : "Iniciar grabación"}
                            </span>
                          </button>
                        </div>

                        <div>
                          <label
                            className="block text-xs xs:text-sm md:text-base font-semibold tracking-wide mb-1.5 xs:mb-2 bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(90,160,255,0.3)]"
                            style={{
                              fontFamily: "'Rajdhani', sans-serif",
                              letterSpacing: "0.08em",
                            }}
                          >
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
                              placeholder="Ingresa tu nueva contraseña"
                              disabled={loading}
                              className="w-full px-3 xs:px-4 sm:px-5 py-2.5 xs:py-3 sm:py-4 pr-10 xs:pr-12 bg-slate-900/50 border border-slate-700/50 rounded-lg xs:rounded-xl sm:rounded-2xl text-xs xs:text-sm sm:text-base text-white placeholder-slate-500 focus:border-blue-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 xs:right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors"
                            >
                              {showPassword ? "👁️" : "👁️‍🗨️"}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label
                            className="block text-xs xs:text-sm md:text-base font-semibold tracking-wide mb-1.5 xs:mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(120,100,255,0.35)]"
                            style={{
                              fontFamily: "'Rajdhani', sans-serif",
                              letterSpacing: "0.08em",
                            }}
                          >
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
                              className="w-full px-3 xs:px-4 sm:px-5 py-2.5 xs:py-3 sm:py-4 pr-10 xs:pr-12 bg-slate-900/50 border border-slate-700/50 rounded-lg xs:rounded-xl sm:rounded-2xl text-xs xs:text-sm sm:text-base text-white placeholder-slate-500 focus:border-indigo-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 xs:right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                            >
                              {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                            </button>
                          </div>
                        </div>

                        {success && (
                          <div className="flex gap-2 p-3 xs:p-4 bg-green-500/10 border border-green-500/30 rounded-lg xs:rounded-xl">
                            <CheckCircle
                              size={18}
                              className="text-green-400 flex-shrink-0 mt-0.5"
                            />
                            <p className="text-green-400 text-xs xs:text-sm">
                              {success}
                            </p>
                          </div>
                        )}

                        <button
                          onClick={handleChangePassword}
                          disabled={
                            loading ||
                            (recoveryMethod === "voice" && !voiceReady)
                          }
                          className="relative w-full py-3 xs:py-4 sm:py-5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-green-600/50 disabled:to-emerald-600/50 rounded-lg xs:rounded-xl sm:rounded-2xl text-white font-bold text-xs xs:text-sm sm:text-base md:text-lg tracking-[0.2em] uppercase overflow-hidden group transition-all shadow-lg hover:shadow-green-500/20 disabled:cursor-not-allowed"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {loading ? (
                              <>
                                <Loader size={18} className="animate-spin" />
                                Cambiando...
                              </>
                            ) : (
                              <>
                                <Lock size={18} />
                                Cambiar Contraseña
                              </>
                            )}
                          </span>
                        </button>
                      </div>
                    )}

                    {recoveryMethod === "face" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 xs:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg xs:rounded-xl">
                          <Camera className="w-5 h-5 text-blue-400" />
                          <p className="text-blue-400 text-xs xs:text-sm">
                            La cámara se activará cuando presiones "Cambiar
                            Contraseña".
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={changeBiometricMethod}
                      disabled={biometricLoading}
                      className="w-full py-2 text-slate-400 hover:text-blue-400 transition-colors text-sm xs:text-base font-medium"
                    >
                      Cambiar método
                    </button>
                  </>
                )}
              </div>
            )}

            {/* STEP 2: Nueva contraseña */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl xs:text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
                  Paso 2: Nueva contraseña
                </h2>

                {recoveryMethod === "face" ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs xs:text-sm text-slate-300 mb-2">
                          Selecciona una cámara
                        </label>
                        <select
                          value={selectedCameraId ?? ""}
                          onChange={(e) => updateSelectedCamera(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white text-sm focus:border-blue-500/50 focus:bg-slate-900/70 outline-none transition-all"
                        >
                          {availableCameras.length === 0 ? (
                            <option value="">Sin cámaras disponibles</option>
                          ) : (
                            availableCameras.map((c) => (
                              <option key={c.deviceId} value={c.deviceId}>
                                {c.label ||
                                  `Cámara ${c.deviceId.substring(0, 6)}`}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      <video
                        ref={videoRef}
                        className="w-full rounded-lg xs:rounded-xl bg-black border border-slate-700/50"
                        style={{ maxHeight: "320px" }}
                      />
                      <div className="flex items-center gap-2 p-2 xs:p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg xs:rounded-xl">
                        {biometricLoading ? (
                          <Loader
                            size={16}
                            className="text-blue-400 animate-spin"
                          />
                        ) : (
                          <CheckCircle size={16} className="text-blue-400" />
                        )}
                        <p className="text-blue-400 text-xs">
                          {biometricStatus || "Cámara lista"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label
                          className="block text-xs xs:text-sm md:text-base font-semibold tracking-wide mb-1.5 xs:mb-2 bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(90,160,255,0.3)]"
                          style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            letterSpacing: "0.08em",
                          }}
                        >
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
                            placeholder="Ingresa tu nueva contraseña"
                            disabled={loading}
                            className="w-full px-3 xs:px-4 py-2.5 xs:py-3 pr-10 bg-slate-900/50 border border-slate-700/50 rounded-lg xs:rounded-xl text-xs xs:text-sm text-white placeholder-slate-500 focus:border-blue-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 xs:right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors"
                          >
                            {showPassword ? "👁️" : "👁️‍🗨️"}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label
                          className="block text-xs xs:text-sm md:text-base font-semibold tracking-wide mb-1.5 xs:mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(120,100,255,0.35)]"
                          style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            letterSpacing: "0.08em",
                          }}
                        >
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
                            className="w-full px-3 xs:px-4 py-2.5 xs:py-3 pr-10 bg-slate-900/50 border border-slate-700/50 rounded-lg xs:rounded-xl text-xs xs:text-sm text-white placeholder-slate-500 focus:border-indigo-500/50 focus:bg-slate-900/70 outline-none transition-all disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-3 xs:right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                          >
                            {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg xs:rounded-xl animate-pulse">
                          <AlertCircle size={18} className="text-red-400" />
                          <p className="text-red-400 text-xs xs:text-sm">
                            {error}
                          </p>
                        </div>
                      )}

                      {success && (
                        <div className="flex gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg xs:rounded-xl">
                          <CheckCircle size={18} className="text-green-400" />
                          <p className="text-green-400 text-xs xs:text-sm">
                            {success}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={handleChangePassword}
                        disabled={loading}
                        className="relative w-full py-3 xs:py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-green-600/50 disabled:to-emerald-600/50 rounded-lg xs:rounded-xl text-white font-bold text-xs xs:text-sm sm:text-base tracking-[0.2em] uppercase overflow-hidden group transition-all shadow-lg hover:shadow-green-500/20 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {loading ? (
                            <>
                              <Loader size={18} className="animate-spin" />
                              Cambiando...
                            </>
                          ) : (
                            <>
                              <Lock size={18} />
                              Cambiar Contraseña
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Reset Button */}
            {step > 1 && (
              <button
                onClick={resetProcess}
                className="w-full mt-4 xs:mt-6 py-2 text-slate-400 hover:text-blue-400 transition-colors text-sm xs:text-base font-medium"
              >
                Comenzar de nuevo
              </button>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-slate-500 text-xs xs:text-sm mt-6">
            ¿Recordaste tu contraseña?{" "}
            <a
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              Volver al login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
