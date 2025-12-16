// ... imports
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Camera,
  Power,
  ScanFace,
  Loader2,
  CheckCircle,
  XCircle,
  DoorOpen,
} from "lucide-react";
import SimpleCard from "../components/UI/Card";
import PageHeader from "../components/UI/PageHeader";
import { useThemeByTime } from "../hooks/useThemeByTime";
import { useSecurityCameras } from "../hooks/useSecurityCameras";
import { useCameraStream } from "../hooks/useCameraStream";
import { Wifi, WifiOff } from "lucide-react";
import { axiosInstance } from "../services/authService";

// --- Door Control Modal Component ---
interface DoorControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isProcessing: boolean;
}

function DoorControlModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isProcessing,
}: DoorControlModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-cyan-500/20">
              <DoorOpen className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
          <p className="text-slate-300 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Abriendo...
                </>
              ) : (
                <>
                  <DoorOpen className="w-4 h-4" />
                  Sí, Abrir Puerta
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface CameraStreamViewProps {
  cameraId: string;
  isActive: boolean;
  label: string;
  onRecognize?: () => void;
  onManualDoorOpen?: () => void; // New prop
  isRecognizing?: boolean;
  recognitionResult?: {
    success: boolean;
    recognized_users?: string[];
    message?: string;
  } | null;
}

function CameraStreamView({
  cameraId,
  isActive,
  label,
  onRecognize,
  onManualDoorOpen,
  isRecognizing = false,
  recognitionResult,
}: CameraStreamViewProps) {
  // Only use camera stream when explicitly active
  const { imageUrl, error, isLoading } = useCameraStream({
    cameraId,
    enabled: isActive, // This ensures stream only starts when camera is toggled ON
  });

  const showControls = cameraId === "door" && isActive;

  // Show disabled state when camera is off
  if (!isActive) {
    return (
      <>
        <img
          src={`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 448'%3E%3Crect fill='%23020617' width='400' height='448'/%3E%3C/svg%3E`}
          alt="feed"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center border border-red-500/30">
            <Camera className="w-6 h-6 text-red-400" />
          </div>
          <span className="text-red-400 font-medium text-sm">
            Cámara apagada
          </span>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center border border-red-500/30">
          <Camera className="w-6 h-6 text-red-400" />
        </div>
        <span className="text-red-400 font-medium text-sm">Error: {error}</span>
      </div>
    );
  }

  if (isLoading || !imageUrl) {
    return (
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-cyan-500/15 flex items-center justify-center border border-cyan-500/30">
          <Camera className="w-6 h-6 text-cyan-400 animate-pulse" />
        </div>
        <span className="text-cyan-400 font-medium text-sm">Cargando...</span>
      </div>
    );
  }

  return (
    <>
      <img
        src={imageUrl}
        alt={`Cámara ${label} en vivo`}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent animate-pulse" />

      {showControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-3">
          <button
            onClick={onRecognize}
            disabled={isRecognizing}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
              isRecognizing
                ? "bg-cyan-500/50 text-cyan-100 cursor-not-allowed"
                : "bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg hover:shadow-cyan-500/50"
            }`}
          >
            {isRecognizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reconociendo...
              </>
            ) : (
              <>
                <ScanFace className="w-4 h-4" />
                Reconocer Rostro
              </>
            )}
          </button>

          <button
            onClick={onManualDoorOpen}
            className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-emerald-500/50"
          >
            <DoorOpen className="w-4 h-4" />
            Abrir
          </button>
        </div>
      )}

      {recognitionResult && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20"
        >
          <div
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${
              recognitionResult.success &&
              recognitionResult.recognized_users &&
              recognitionResult.recognized_users.length > 0
                ? "bg-green-500/90 text-white"
                : "bg-red-500/90 text-white"
            }`}
          >
            {recognitionResult.success &&
            recognitionResult.recognized_users &&
            recognitionResult.recognized_users.length > 0 ? (
              <>
                <CheckCircle className="w-4 h-4" />
                ¡Bienvenido, {recognitionResult.recognized_users.join(", ")}!
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                {recognitionResult.message || "No se reconoció a nadie"}
              </>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
}

export default function MonitoreoSeguridad() {
  const { colors } = useThemeByTime();
  const {
    systemOn,
    setSystemOn,
    camerasList,
    cameraStates,
    toggleCamera,
    activeCameras,
  } = useSecurityCameras();

  const [recognitionState, setRecognitionState] = useState<{
    [key: string]: {
      isRecognizing: boolean;
      result: {
        success: boolean;
        recognized_users?: string[];
        message?: string;
      } | null;
    };
  }>({});

  // Door Control State
  const [mainDoorId, setMainDoorId] = useState<number | null>(null);
  const [showDoorModal, setShowDoorModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", message: "" });
  const [isOpeningDoor, setIsOpeningDoor] = useState(false);

  // Fetch Main Door ID
  useEffect(() => {
    const fetchDoorId = async () => {
      try {
        const response = await axiosInstance.get("/iot/device_states");
        const door = response.data.find(
          (d: any) => d.device_name === "DOOR_PRINCIPAL"
        );
        if (door) {
          setMainDoorId(door.id);
        }
      } catch (error) {
        console.error("Error fetching device states:", error);
      }
    };
    fetchDoorId();
  }, []);

  const handleOpenDoor = async () => {
    if (!mainDoorId) return;
    setIsOpeningDoor(true);
    try {
      await axiosInstance.put(`/iot/device_states/${mainDoorId}`, {
        new_state: { status: "OPEN" },
      });
      // Close modal immediately or show success feedback?
      // Let's close modal and maybe show a toast or rely on camera feed observing the door
      setShowDoorModal(false);
    } catch (error) {
      console.error("Error opening door:", error);
      // Could show error state in modal
    } finally {
      setIsOpeningDoor(false);
    }
  };

  const handleManualDoorClick = () => {
    setModalContent({
      title: "Abrir Puerta Principal",
      message:
        "¿Estás seguro de que deseas abrir la puerta principal sin reconocimiento?",
    });
    setShowDoorModal(true);
  };

  const handleRecognize = async (cameraId: string) => {
    setRecognitionState((prev) => ({
      ...prev,
      [cameraId]: { isRecognizing: true, result: null },
    }));

    try {
      // Use axiosInstance which handles token refresh automatically
      const response = await axiosInstance.post(
        `/cameras/${cameraId}/snapshot-recognize`
      );

      const result = response.data;

      setRecognitionState((prev) => ({
        ...prev,
        [cameraId]: { isRecognizing: false, result },
      }));

      // If recognition successful and users found, prompt to open door
      if (
        result.success &&
        result.recognized_users &&
        result.recognized_users.length > 0
      ) {
        setModalContent({
          title: "Usuario Reconocido",
          message: `Se ha reconocido a ${result.recognized_users.join(
            ", "
          )}. ¿Deseas abrir la puerta principal?`,
        });
        setShowDoorModal(true);
      }

      // Clear result after 5 seconds
      setTimeout(() => {
        setRecognitionState((prev) => ({
          ...prev,
          [cameraId]: { isRecognizing: false, result: null },
        }));
      }, 5000);
    } catch (error: any) {
      console.error("Error en reconocimiento facial:", error);
      setRecognitionState((prev) => ({
        ...prev,
        [cameraId]: {
          isRecognizing: false,
          result: {
            success: false,
            message: error.message || "Error al reconocer",
          },
        },
      }));

      // Clear error after 5 seconds
      setTimeout(() => {
        setRecognitionState((prev) => ({
          ...prev,
          [cameraId]: { isRecognizing: false, result: null },
        }));
      }, 5000);
    }
  };

  return (
    <div
      className={`p-2 md:p-6 pt-8 md:pt-6 space-y-4 md:space-y-6 font-inter w-full ${colors.background} ${colors.text}`}
    >
      <PageHeader
        title="Monitoreo y Seguridad"
        icon={<Shield className={`w-8 md:w-10 h-8 md:h-10 ${colors.icon}`} />}
      />

      <DoorControlModal
        isOpen={showDoorModal}
        onClose={() => setShowDoorModal(false)}
        onConfirm={handleOpenDoor}
        title={modalContent.title}
        message={modalContent.message}
        isProcessing={isOpeningDoor}
      />

      <div className="mt-6 px-6">
        <AnimatePresence mode="wait">
          {/* ... existing content ... */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* ... Header and Status Card ... */}
            <div className="flex items-center gap-3 mb-6">
              <Camera className={`w-6 h-6 ${colors.cyanIcon}`} />
              <h4 className={`text-2xl font-bold ${colors.text}`}>
                Sistema de Cámaras
              </h4>
            </div>

            <SimpleCard
              className={`p-4 sm:p-5 md:p-6 mb-6 md:mb-8 border transition-all ${
                systemOn
                  ? `bg-gradient-to-r ${colors.cyanGradient} ${colors.humidityShadow}`
                  : `${colors.cardBg} ${colors.border}`
              }`}
            >
              {/* ... Status Card Content ... */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <Power
                    className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${
                      systemOn ? colors.cyanIcon : colors.mutedText
                    }`}
                  />
                  <div>
                    <p className={`text-xs sm:text-sm ${colors.mutedText}`}>
                      Estado del Sistema
                    </p>
                    <p
                      className={`text-sm sm:text-base md:text-lg font-bold ${
                        systemOn ? colors.greenText : colors.mutedText
                      }`}
                    >
                      {systemOn
                        ? `${activeCameras}/${camerasList.length} Cámaras Activas`
                        : "Sistema Desactivado"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSystemOn(!systemOn)}
                  className={`p-2 sm:p-2.5 md:p-3 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center ${
                    systemOn ? colors.successChip : colors.dangerChip
                  }`}
                  aria-label={systemOn ? "Apagar sistema" : "Encender sistema"}
                >
                  <Power className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5" />
                </button>
              </div>
            </SimpleCard>

            <div className="grid grid-cols-1 gap-4 md:gap-6">
              {camerasList.map((camera) => {
                const isActive = cameraStates[camera.id] && systemOn;

                return (
                  <SimpleCard
                    key={camera.id}
                    className={`overflow-hidden border transition-all ${
                      isActive
                        ? `bg-gradient-to-br ${colors.cyanGradient} shadow-lg shadow-cyan-500/20`
                        : `${colors.cardBg} ${colors.border}`
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="p-3 sm:p-4 md:p-5 flex items-center justify-between border-b border-slate-700/30">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div
                            className={`p-1.5 sm:p-2 rounded-lg ${
                              isActive ? "bg-green-500/20" : "bg-slate-700/30"
                            }`}
                          >
                            <Camera
                              className={`w-4 sm:w-5 ${
                                isActive ? "text-green-400" : colors.mutedText
                              }`}
                            />
                          </div>
                          <div>
                            <p
                              className={`text-xs sm:text-sm font-medium ${colors.text}`}
                            >
                              {camera.label}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {isActive ? (
                                <>
                                  <Wifi className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-green-400" />
                                  <span className="text-xs text-green-400">
                                    En línea
                                  </span>
                                </>
                              ) : (
                                <>
                                  <WifiOff className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-red-400" />
                                  <span className="text-xs text-red-400">
                                    Desactivada
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleCamera(camera.id)}
                          disabled={!systemOn}
                          className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                            isActive
                              ? "bg-green-500/30 text-green-400 hover:bg-green-500/40"
                              : "bg-slate-700/30 text-slate-500 hover:bg-slate-700/50"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          aria-label={`${camera.label}: ${
                            cameraStates[camera.id] ? "desactivar" : "activar"
                          }`}
                        >
                          <Power className="w-4 sm:w-5" />
                        </button>
                      </div>

                      <div className="relative w-full h-48 sm:h-64 md:h-[28rem] bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
                        <div
                          className={`absolute top-3 right-3 w-3 h-3 rounded-full ${
                            isActive
                              ? "bg-green-500 animate-pulse"
                              : "bg-red-500"
                          } shadow-lg`}
                        />

                        <CameraStreamView
                          cameraId={camera.id}
                          isActive={isActive}
                          label={camera.label}
                          onRecognize={() => handleRecognize(camera.id)}
                          onManualDoorOpen={handleManualDoorClick} // Pass handler
                          isRecognizing={
                            recognitionState[camera.id]?.isRecognizing || false
                          }
                          recognitionResult={
                            recognitionState[camera.id]?.result || null
                          }
                        />
                      </div>

                      <div className="p-2 sm:p-3 md:p-4 bg-slate-900/50 border-t border-slate-700/30 flex items-center gap-2 sm:gap-3">
                        <div
                          className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                            isActive ? "bg-green-500" : "bg-slate-500"
                          }`}
                        />
                        <Camera className="w-3 sm:w-4 h-3 sm:h-4 text-slate-400" />
                        <span
                          className={`text-xs sm:text-sm font-medium ${colors.mutedText}`}
                        >
                          {camera.label}
                        </span>
                      </div>
                    </div>
                  </SimpleCard>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
