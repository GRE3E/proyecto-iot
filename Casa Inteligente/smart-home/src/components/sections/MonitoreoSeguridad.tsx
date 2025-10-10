"use client"

import { useState, useEffect } from "react"
import SimpleCard from "../UI/SimpleCard"
import SimpleSecurityCamera from "../widgets/SecurityCamera"
import { 
  Shield, 
  Thermometer, 
  Camera, 
  AlertTriangle, 
  Activity,
  TrendingUp,
  Droplets,
  Zap,
  Power,
  CheckCircle,
  Lock,
  Brain,
  DoorClosed,
  Utensils,
  ShowerHead,
  Users,
  WashingMachine,
  Grid2X2,
  ChevronLeft,
  ChevronRight,
  Car,
  FullscreenIcon,
  ThermometerIcon,
  MegaphoneIcon,
  AirVentIcon,
  FanIcon,
  LightbulbIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface Props {
  temperature: number
  setTemperature: (v: number) => void
  humidity: number
  setHumidity: (v: number) => void
  energyUsage: number
  setEnergyUsage: (v: number) => void
}

export default function MonitoreoSeguridad({
  temperature,
  setTemperature,
  humidity,
  setHumidity,
  energyUsage,
  setEnergyUsage,
}: Props) {
  const [activeTab, setActiveTab] = useState<"monitoreo" | "seguridad">("seguridad")
  const [deviceStates, setDeviceStates] = useState<boolean[]>([])
  const [cameraOn, setCameraOn] = useState(false)
  const [backgroundColor, setBackgroundColor] = useState("from-purple-900/30 to-indigo-900/30")
  const [currentPage, setCurrentPage] = useState(1)
  const [allDevicesOn, setAllDevicesOn] = useState(false)
  const [pageTransition, setPageTransition] = useState(false)
  const [isSystemCardVisible, setIsSystemCardVisible] = useState(true)
  const [shouldRenderSystemCard, setShouldRenderSystemCard] = useState(true)

  useEffect(() => {
    const updateBackgroundColor = () => {
      const hour = new Date().getHours()
      if (hour >= 6 && hour < 12) {
        setBackgroundColor("from-yellow-900/30 to-amber-900/30")
      } else if (hour >= 12 && hour < 18) {
        setBackgroundColor("from-cyan-900/30 to-blue-900/30")
      } else if (hour >= 18 || hour < 6) {
        setBackgroundColor("from-purple-900/30 to-indigo-900/30")
      }
    }
    updateBackgroundColor()
    const interval = setInterval(updateBackgroundColor, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const totalDevices = [...devicesPage1, ...devicesPage2, ...devicesPage3].length
    setDeviceStates(new Array(totalDevices).fill(false))
  }, [])

  useEffect(() => {
    if (!isSystemCardVisible) {
      const timer = setTimeout(() => {
        setShouldRenderSystemCard(false)
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setShouldRenderSystemCard(true)
    }
  }, [isSystemCardVisible])

  const toggleDevice = (index: number) => {
    setDeviceStates((prev) =>
      prev.map((state, i) => (i === index ? !state : state))
    )
  }

  const toggleAllDevices = () => {
    const newState = !allDevicesOn
    setDeviceStates(new Array(deviceStates.length).fill(newState))
    setAllDevicesOn(newState)
  }

  const devicesPage1 = [
    { icon: Brain, title: "Cerebro", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: FullscreenIcon, title: "Pantalla LCD", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: AirVentIcon, title: "Aire acondicionado", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: FanIcon, title: "Ventilador", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: ThermometerIcon, title: "Sensor de temperatura", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: MegaphoneIcon, title: "Sensor de ultrasonido", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: Car, title: "Cochera", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: DoorClosed, title: "Puerta principal", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: Utensils, title: "Puerta de la cocina", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: WashingMachine, title: "Puerta de la lavandería", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: DoorClosed, title: "Habitación principal", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: ShowerHead, title: "Baño Principal", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
  ]

  const devicesPage2 = [
    { icon: Users, title: "Habitación Invitados", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: ShowerHead, title: "Baño de invitados", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: Grid2X2, title: "Ventanas de la sala", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: Grid2X2, title: "Ventana de la cocina", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: Grid2X2, title: "Ventana de la habitación principal", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: Grid2X2, title: "Ventana del baño principal", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: Grid2X2, title: "Ventana de la habitación de invitados", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: Grid2X2, title: "Ventana del baño de invitados", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: Grid2X2, title: "Ventana de la lavandería", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: Grid2X2, title: "Ventana de la cochera", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: Grid2X2, title: "Ventana de la cochera", status: (index: number) => deviceStates[index] ? "Bloqueado" : "Desbloqueado" },
    { icon: LightbulbIcon, title: "Luz de la sala", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
  ]

  const devicesPage3 = [
    { icon: LightbulbIcon, title: "Luz de la cocina", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: LightbulbIcon, title: "Luz habitación principal", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: LightbulbIcon, title: "Luz del baño principal", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: LightbulbIcon, title: "Luz de la habitación principal", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: LightbulbIcon, title: "Luz del baño de invitados", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: LightbulbIcon, title: "Luz de la lavandería", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
    { icon: LightbulbIcon, title: "Luz de la cochera", status: (index: number) => deviceStates[index] ? "Encendido" : "Apagado" },
  ]

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= 3) {
      setPageTransition(true)
      setTimeout(() => {
        setCurrentPage(page)
        setPageTransition(false)
      }, 300)
    }
  }

  const getGlobalIndex = (page: number, index: number) => {
    if (page === 1) return index
    if (page === 2) return devicesPage1.length + index
    return devicesPage1.length + devicesPage2.length + index
  }

  return (
    <div className="font-inter">
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes glow {
          0% { box-shadow: 0 0 4px rgba(255, 255, 255, 0.2); }
          50% { box-shadow: 0 0 12px rgba(255, 255, 255, 0.4), 0 0 24px rgba(255, 255, 255, 0.2); }
          100% { box-shadow: 0 0 4px rgba(255, 255, 255, 0.2); }
        }
        @keyframes toggleGlow {
          0% { box-shadow: 0 0 6px 1px var(--glow-color); }
          50% { box-shadow: 0 0 10px 3px var(--glow-color); }
          100% { box-shadow: 0 0 6px 1px var(--glow-color); }
        }
        @keyframes cameraFadeIn {
          0% { opacity: 0.4; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes cameraFadeOut {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.4; transform: scale(0.97); }
        }
        @keyframes valuePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes slideIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fillProgress {
          0% { width: 0%; }
          100% { width: var(--progress-width); }
        }
        @keyframes pageTransition {
          0% { opacity: 0; transform: translateX(10px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes deviceSlideIn {
          0% { opacity: 0; transform: translateX(10px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes deviceSlideOut {
          0% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-10px); }
        }
        @keyframes cardShow {
          0% { opacity: 0; transform: translateY(10px); height: 0; overflow: hidden; }
          100% { opacity: 1; transform: translateY(0); height: auto; overflow: visible; }
        }
        @keyframes cardHide {
          0% { opacity: 1; transform: translateY(0); height: auto; overflow: visible; }
          100% { opacity: 0; transform: translateY(10px); height: 0; overflow: hidden; }
        }
        @keyframes camerasSlideDown {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(10px); opacity: 1; }
        }
        @keyframes camerasSlideUp {
          0% { transform: translateY(10px); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes cameraCardSlideDown {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(10px); opacity: 1; }
        }
        @keyframes cameraCardSlideUp {
          0% { transform: translateY(10px); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes cameraItemSlideDown {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(10px); opacity: 1; }
        }
        @keyframes cameraItemSlideUp {
          0% { transform: translateY(10px); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .security-card {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .security-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 3px 12px rgba(255, 255, 255, 0.15);
        }
        .toggle-switch {
          position: relative;
          width: 40px;
          height: 24px;
          border-radius: 12px;
          overflow: hidden;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ef4444;
          transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 12px;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        input:checked + .slider {
          background-color: #22c55e;
        }
        input:checked + .slider:before {
          transform: translateX(16px);
        }
        .toggle-switch:hover .slider {
          transform: scale(1.02);
        }
        .toggle-switch-on {
          animation: toggleGlow 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          --glow-color: rgba(34, 197, 94, 0.5);
        }
        .toggle-switch-off {
          animation: toggleGlow 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          --glow-color: rgba(239, 68, 68, 0.5);
        }
        .power-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .power-button:hover {
          transform: scale(1.08);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .power-button-on {
          background: linear-gradient(145deg, #22c55e, #16a34a);
        }
        .power-button-off {
          background: linear-gradient(145deg, #ef4444, #dc2626);
        }
        .active-pulse {
          animation: pulse 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .glow-effect {
          animation: glow 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .camera-transition {
          transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .camera-on {
          animation: cameraFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .camera-off {
          animation: cameraFadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          opacity: 0.4;
          transform: scale(0.97);
        }
        .slider-value {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .slider-value-changed {
          animation: valuePop 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-slider:hover::-webkit-slider-thumb {
          transform: scale(1.1);
        }
        .custom-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-slider:hover::-moz-range-thumb {
          transform: scale(1.1);
        }
        .air-quality-bar {
          height: 6px;
          border-radius: 3px;
          background: #1e293b;
          overflow: hidden;
          position: relative;
        }
        .air-quality-fill {
          height: 100%;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fillProgress 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .recommendation-card {
          animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .recommendation-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 3px 12px rgba(255, 255, 255, 0.15);
        }
        .page-transition {
          animation: ${pageTransition ? 'deviceSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'deviceSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'};
        }
        .device-card {
          animation: ${pageTransition ? 'deviceSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'deviceSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'};
        }
        .device-card:nth-child(1) { animation-delay: 0.02s; }
        .device-card:nth-child(2) { animation-delay: 0.04s; }
        .device-card:nth-child(3) { animation-delay: 0.06s; }
        .device-card:nth-child(4) { animation-delay: 0.08s; }
        .device-card:nth-child(5) { animation-delay: 0.10s; }
        .device-card:nth-child(6) { animation-delay: 0.12s; }
        .device-card:nth-child(7) { animation-delay: 0.14s; }
        .device-card:nth-child(8) { animation-delay: 0.16s; }
        .device-card:nth-child(9) { animation-delay: 0.18s; }
        .device-card:nth-child(10) { animation-delay: 0.20s; }
        .device-card:nth-child(11) { animation-delay: 0.22s; }
        .device-card:nth-child(12) { animation-delay: 0.24s; }
        .pagination-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pagination-button:hover {
          transform: scale(1.08);
          background-color: rgba(255, 255, 255, 0.1);
        }
        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .toggle-all-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .toggle-all-button:hover {
          transform: scale(1.04);
          box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15);
        }
        .toggle-card-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .toggle-card-button:hover {
          transform: scale(1.04);
          box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15);
        }
        .system-card {
          display: ${shouldRenderSystemCard ? 'block' : 'none'};
          animation: ${isSystemCardVisible ? 'cardShow 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'cardHide 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'};
        }
        .cameras-section {
          animation: ${isSystemCardVisible ? 'camerasSlideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'camerasSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'};
        }
        .camera-container-card {
          animation: ${isSystemCardVisible ? 'cameraCardSlideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'cameraCardSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'};
          animation-delay: 0.04s;
        }
        .camera-item {
          animation: ${isSystemCardVisible ? 'cameraItemSlideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'cameraItemSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards'};
        }
        .camera-item:nth-child(1) { animation-delay: 0.08s; }
        .camera-item:nth-child(2) { animation-delay: 0.12s; }
        .camera-item:nth-child(3) { animation-delay: 0.16s; }
        .camera-item:nth-child(4) { animation-delay: 0.20s; }
        .camera-item:nth-child(5) { animation-delay: 0.24s; }
        .camera-item:nth-child(6) { animation-delay: 0.28s; }
      `}</style>

      <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight leading-normal py-2">
        Monitoreo y Seguridad
      </h2>

      <div className="mb-6 flex flex-col sm:flex-row gap-3" role="tablist" aria-label="Monitoreo y Seguridad Tabs">
        <button
          onClick={() => setActiveTab("seguridad")}
          role="tab"
          aria-selected={activeTab === "seguridad"}
          className={`px-4 md:px-5 py-2 md:py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm md:text-base ${
            activeTab === "seguridad" ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg" : "bg-slate-800/50 text-slate-300"
          }`}
        >
          <Shield className="w-4 h-4" />
          Seguridad
        </button>

        <button
          onClick={() => setActiveTab("monitoreo")}
          role="tab"
          aria-selected={activeTab === "monitoreo"}
          className={`px-4 md:px-5 py-2 md:py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm md:text-base ${
            activeTab === "monitoreo" ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg" : "bg-slate-800/50 text-slate-300"
          }`}
        >
          <Activity className="w-4 h-4" />
          Monitoreo Ambiental
        </button>
      </div>

      <div className="relative">
        <div
          className={`transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            activeTab === "monitoreo" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none absolute top-0 left-0 w-full"
          }`}
          role="tabpanel"
          aria-hidden={activeTab !== "monitoreo"}
        >
          <h3 className="text-xl md:text-2xl font-bold mb-4 text-cyan-300 font-inter flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Indicadores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-6">
            <SimpleCard className="p-6 flex flex-col items-center bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
              <h4 className="text-lg font-semibold text-cyan-300 mb-4">Temperatura</h4>
              <div className="relative w-40 h-56">
                <svg viewBox="0 0 120 220" className="w-full h-full drop-shadow-lg">
                  <defs>
                    <linearGradient id="tempGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4"/>
                      <stop offset="50%" stopColor="#22d3ee"/>
                      <stop offset="100%" stopColor="#67e8f9"/>
                    </linearGradient>
                    <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0e7490" stopOpacity="0.3"/>
                      <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.1"/>
                      <stop offset="100%" stopColor="#0e7490" stopOpacity="0.3"/>
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <ellipse cx="60" cy="205" rx="30" ry="8" fill="black" opacity="0.2"/>
                  <rect x="50" y="25" width="20" height="150" fill="url(#glassGradient)" stroke="#0891b2" strokeWidth="2.5" rx="10"/>
                  <circle cx="60" cy="175" r="28" fill="#0f172a" stroke="#0891b2" strokeWidth="2.5"/>
                  <rect x="54" y="30" width="12" height="148" fill="#0f172a" rx="6"/>
                  <rect 
                    x="55" 
                    y={20 + (148 - (temperature / 35) * 138)} 
                    width="10" 
                    height={(temperature / 35) * 128 + 20} 
                    fill="url(#tempGradient)" 
                    rx="5"
                    filter="url(#glow)"
                  />
                  <circle cx="60" cy="175" r="20" fill="url(#tempGradient)" filter="url(#glow)"/>
                  <ellipse cx="54" cy="170" rx="8" ry="10" fill="rgba(255,255,255,0.4)"/>
                  <circle cx="52" cy="168" r="3" fill="rgba(255,255,255,0.8)"/>
                  <g stroke="#ffffffff" strokeWidth="0.3">
                    <line x1="82" y1="35" x2="92" y2="35"/>
                    <text x="96" y="39" fill="#94a3b8" fontSize="10" fontWeight="">35</text>
                    <line x1="82" y1="54" x2="92" y2="54"/>
                    <text x="96" y="58" fill="#94a3b8" fontSize="10" fontWeight="">30</text>
                    <line x1="82" y1="73" x2="92" y2="73"/>
                    <text x="96" y="77" fill="#94a3b8" fontSize="10" fontWeight="">25°</text>
                    <line x1="82" y1="92" x2="92" y2="92"/>
                    <text x="96" y="96" fill="#94a3b8" fontSize="10" fontWeight="">20°</text>
                    <line x1="82" y1="111" x2="92" y2="111"/>
                    <text x="96" y="115" fill="#94a3b8" fontSize="10" fontWeight="">15°</text>
                    <line x1="82" y1="130" x2="92" y2="130"/>
                    <text x="96" y="134" fill="#94a3b8" fontSize="10" fontWeight="">10°</text>
                  </g>
                </svg>
              </div>
              <div className="text-center mt-4">
                <div className="text-5xl font-bold text-cyan-400 drop-shadow-lg">{temperature}°C</div>
                <div className="text-sm text-slate-400 mt-2">Máximo: 35°C</div>
              </div>
            </SimpleCard>

            <SimpleCard className="p-6 flex flex-col items-center bg-gradient-to-br from-purple-500/5 to-pink-500/5">
              <h4 className="text-lg font-semibold text-purple-300 mb-4">Humedad</h4>
              <div className="relative w-52 h-56 flex items-center justify-center">
                <svg viewBox="0 0 180 200" className="w-full h-full drop-shadow-2xl">
                  <defs>
                    <linearGradient id="waterFill" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#581c87"/>
                      <stop offset="30%" stopColor="#7c3aed"/>
                      <stop offset="70%" stopColor="#a855f7"/>
                      <stop offset="100%" stopColor="#d8b4fe"/>
                    </linearGradient>
                    <linearGradient id="dropOutline" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9333ea"/>
                      <stop offset="100%" stopColor="#c084fc"/>
                    </linearGradient>
                    <radialGradient id="glowEffect" cx="40%" cy="35%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.9"/>
                      <stop offset="40%" stopColor="white" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="white" stopOpacity="0"/>
                    </radialGradient>
                    <filter id="softGlow">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    <clipPath id="dropShape">
                      <path d="M90,30 C90,30 55,65 55,100 C55,122 66,140 90,140 C114,140 125,122 125,100 C125,65 90,30 90,30 Z"/>
                    </clipPath>
                  </defs>
                  <ellipse cx="90" cy="155" rx="36" ry="6" fill="black" opacity="0.15"/>
                  <path 
                    d="M90,30 C90,30 55,65 55,100 C55,122 66,140 90,140 C114,140 125,122 125,100 C125,65 90,30 90,30 Z"
                    fill="#a855f7"
                    opacity="0.2"
                    filter="blur(12px)"
                  />
                  <path 
                    d="M90,30 C90,30 55,65 55,100 C55,122 66,140 90,140 C114,140 125,122 125,100 C125,65 90,30 90,30 Z"
                    fill="#0f172a"
                    stroke="url(#dropOutline)"
                    strokeWidth="2.5"
                    filter="url(#softGlow)"
                  />
                  <rect 
                    x="50"
                    y={140 - (humidity / 100) * 110}
                    width="80"
                    height={(humidity / 100) * 110}
                    fill="url(#waterFill)"
                    clipPath="url(#dropShape)"
                  />
                  <g clipPath="url(#dropShape)">
                    <path 
                      d={`M50,${140 - (humidity / 100) * 110} Q62,${138 - (humidity / 100) * 110} 70,${140 - (humidity / 100) * 110} T90,${140 - (humidity / 100) * 110} T130,${140 - (humidity / 100) * 110}`}
                      fill="none"
                      stroke="#d8b4fe"
                      strokeWidth="2"
                      opacity="0.7"
                    >
                      <animate attributeName="d" 
                        values={`M50,${140 - (humidity / 100) * 110} Q62,${138 - (humidity / 100) * 110} 70,${140 - (humidity / 100) * 110} T90,${140 - (humidity / 100) * 110} T130,${140 - (humidity / 100) * 110};
                                M50,${140 - (humidity / 100) * 110} Q62,${142 - (humidity / 100) * 110} 70,${140 - (humidity / 100) * 110} T90,${140 - (humidity / 100) * 110} T130,${140 - (humidity / 100) * 110};
                                M50,${140 - (humidity / 100) * 110} Q62,${138 - (humidity / 100) * 110} 70,${140 - (humidity / 100) * 110} T90,${140 - (humidity / 100) * 110} T130,${140 - (humidity / 100) * 110}`}
                        dur="3s"
                        repeatCount="indefinite"
                      />
                    </path>
                  </g>
                  <ellipse 
                    cx="78" 
                    cy="65" 
                    rx="18" 
                    ry="25" 
                    fill="url(#glowEffect)"
                    opacity="0.8"
                  />
                  <circle cx="100" cy="90" r="6" fill="white" opacity="0.3"/>
                  <circle cx="103" cy="88" r="3" fill="white" opacity="0.5"/>
                  <circle cx="76" cy="55" r="2.5" fill="white" opacity="1"/>
                  <g clipPath="url(#dropShape)">
                    <circle cx="80" cy="120" r="2.5" fill="rgba(255,255,255,0.6)">
                      <animate attributeName="cy" values="120;70" dur="4s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.6;0" dur="4s" repeatCount="indefinite"/>
                      <animate attributeName="r" values="2.5;1.5" dur="4s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="95" cy="130" r="2" fill="rgba(255,255,255,0.5)">
                      <animate attributeName="cy" values="130;80" dur="3.5s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.5;0" dur="3.5s" repeatCount="indefinite"/>
                      <animate attributeName="r" values="2;1" dur="3.5s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="85" cy="125" r="1.5" fill="rgba(255,255,255,0.4)">
                      <animate attributeName="cy" values="125;75" dur="3s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.4;0" dur="3s" repeatCount="indefinite"/>
                    </circle>
                  </g>
                </svg>
              </div>
              <div className="text-center mt-4">
                <div className="text-5xl font-bold text-purple-400 drop-shadow-lg">{humidity}%</div>
                <div className="text-sm text-slate-400 mt-2">Máximo: 100%</div>
              </div>
            </SimpleCard>

            <SimpleCard className="p-6 flex flex-col items-center bg-gradient-to-br from-pink-500/5 to-rose-500/5">
              <h4 className="text-lg font-semibold text-pink-300 mb-4">Energía</h4>
              <div className="relative w-40 h-56 flex items-center justify-center">
                <svg viewBox="0 0 140 200" className="w-full h-full drop-shadow-2xl">
                  <defs>
                    <linearGradient id="boltFill" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#9f1239"/>
                      <stop offset="30%" stopColor="#db2777"/>
                      <stop offset="70%" stopColor="#ec4899"/>
                      <stop offset="100%" stopColor="#fbcfe8"/>
                    </linearGradient>
                    <linearGradient id="boltEdge" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ec4899"/>
                      <stop offset="100%" stopColor="#f472b6"/>
                    </linearGradient>
                    <radialGradient id="sparkRadial">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity="1"/>
                      <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6"/>
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
                    </radialGradient>
                    <filter id="electricGlow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    <clipPath id="boltClipPath">
                      <path d="M70,35 L50,90 L63,90 L43,145 L97,88 L83,88 L103,35 Z"/>
                    </clipPath>
                  </defs>
                  <ellipse cx="70" cy="165" rx="32" ry="6" fill="black" opacity="0.15"/>
                  <path 
                    d="M70,35 L50,90 L63,90 L43,145 L97,98 L83,98 L103,35 Z"
                    fill="#ec4899"
                    opacity="0.15"
                    filter="blur(20px)"
                  />
                  <path 
                    d="M70,35 L50,90 L63,90 L43,145 L97,98 L83,98 L103,35 Z"
                    fill="#f472b6"
                    opacity="0.25"
                    filter="blur(10px)"
                  />
                  <path 
                    d="M70,35 L50,90 L63,90 L43,145 L97,88 L83,88 L103,35 Z"
                    fill="#0f172a"
                    stroke="url(#boltEdge)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    filter="url(#electricGlow)"
                  />
                  <rect 
                    x="45"
                    y={145 - (energyUsage / 500) * 110}
                    width="75"
                    height={(energyUsage / 500) * 110}
                    fill="url(#boltFill)"
                    clipPath="url(#boltClipPath)"
                  />
                  <g opacity="0.9">
                    <path d="M93,45 L90,52" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round">
                      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.8s" repeatCount="indefinite"/>
                    </path>
                    <path d="M87,60 L84,70" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
                      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1s" repeatCount="indefinite"/>
                    </path>
                    <path d="M57,80 L55,88" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
                      <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.9s" repeatCount="indefinite"/>
                    </path>
                    <path d="M90,105 L87,115" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round">
                      <animate attributeName="opacity" values="0.9;0.2;0.9" dur="0.7s" repeatCount="indefinite"/>
                    </path>
                  </g>
                  <circle cx="93" cy="50" r="5" fill="url(#sparkRadial)">
                    <animate attributeName="r" values="5;9;5" dur="1s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="53" cy="85" r="4" fill="url(#sparkRadial)">
                    <animate attributeName="r" values="4;7;4" dur="1.2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.2s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="90" cy="110" r="4.5" fill="url(#sparkRadial)">
                    <animate attributeName="r" values="4.5;8;4.5" dur="0.9s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="1;0.3;1" dur="0.9s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="90" cy="65" r="2" fill="#fbbf24" opacity="0.8">
                    <animate attributeName="cy" values="65;55;65" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="55" cy="95" r="1.5" fill="#fbbf24" opacity="0.7">
                    <animate attributeName="cy" values="95;88;95" dur="1.8s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.8s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="85" cy="125" r="1.8" fill="#fbbf24" opacity="0.9">
                    <animate attributeName="cy" values="125;118;125" dur="1.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.5s" repeatCount="indefinite"/>
                  </circle>
                  <path d="M93,40 L97,38" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.6">
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite"/>
                  </path>
                  <path d="M55,92 L51,94" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.5">
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="1.3s" repeatCount="indefinite"/>
                  </path>
                </svg>
              </div>
              <div className="text-center mt-4">
                <div className="text-5xl font-bold text-pink-400 drop-shadow-lg">{energyUsage} <span className="text-2xl">kWh</span></div>
                <div className="text-sm text-slate-400 mt-2">Máximo: 500 kWh</div>
              </div>
            </SimpleCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-50 animate-pulse"></div>
              <h4 className="text-base md:text-lg font-bold mb-4 text-cyan-400 font-inter flex items-center gap-2 relative z-10">
                <Thermometer className="w-4 h-4" />
                Control de Temperatura
              </h4>
              <div className="flex items-center gap-4 relative z-10">
                <input
                  type="range"
                  min="10"
                  max="35"
                  value={temperature}
                  onChange={(e) => setTemperature(Number.parseInt(e.target.value))}
                  className="w-full h-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg appearance-none cursor-pointer custom-slider"
                  style={{
                    background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(temperature - 10) / (35 - 10) * 100}%, #1e293b ${(temperature - 10) / (35 - 10) * 100}%, #1e293b 100%)`
                  }}
                />
                <span className={`text-lg font-semibold text-cyan-300 slider-value ${temperature ? 'slider-value-changed' : ''}`}>
                  {temperature}°C
                </span>
              </div>
              <div className="text-sm text-slate-400 mt-2 relative z-10">Rango: 10°C - 35°C</div>
            </SimpleCard>

            <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-purple-900/20 to-pink-900/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-50 animate-pulse"></div>
              <h4 className="text-base md:text-lg font-bold mb-4 text-purple-400 font-inter flex items-center gap-2 relative z-10">
                <Droplets className="w-4 h-4" />
                Control de Humedad
              </h4>
              <div className="flex items-center gap-4 relative z-10">
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={humidity}
                  onChange={(e) => setHumidity(Number.parseInt(e.target.value))}
                  className="w-full h-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg appearance-none cursor-pointer custom-slider"
                  style={{
                    background: `linear-gradient(to right, #9333ea 0%, #9333ea ${(humidity - 20) / (80 - 20) * 100}%, #1e293b ${(humidity - 20) / (80 - 20) * 100}%, #1e293b 100%)`
                  }}
                />
                <span className={`text-lg font-semibold text-purple-300 slider-value ${humidity ? 'slider-value-changed' : ''}`}>
                  {humidity}%
                </span>
              </div>
              <div className="text-sm text-slate-400 mt-2 relative z-10">Rango: 20% - 80%</div>
            </SimpleCard>

            <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-pink-900/20 to-rose-900/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 opacity-50 animate-pulse"></div>
              <h4 className="text-base md:text-lg font-bold mb-4 text-pink-400 font-inter flex items-center gap-2 relative z-10">
                <Zap className="w-4 h-4" />
                Control de Energía
              </h4>
              <div className="flex items-center gap-4 relative z-10">
                <input
                  type="range"
                  min="100"
                  max="500"
                  value={energyUsage}
                  onChange={(e) => setEnergyUsage(Number.parseInt(e.target.value))}
                  className="w-full h-3 bg-gradient-to-r from-pink-600 to-rose-600 rounded-lg appearance-none cursor-pointer custom-slider"
                  style={{
                    background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${(energyUsage - 100) / (500 - 100) * 100}%, #1e293b ${(energyUsage - 100) / (500 - 100) * 100}%, #1e293b 100%)`
                  }}
                />
                <span className={`text-lg font-semibold text-pink-300 slider-value ${energyUsage ? 'slider-value-changed' : ''}`}>
                  {energyUsage} kWh
                </span>
              </div>
              <div className="text-sm text-slate-400 mt-2 relative z-10">Rango: 100 kWh - 500 kWh</div>
            </SimpleCard>
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-6">
            <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-50 animate-pulse"></div>
              <h3 className="text-lg md:text-xl font-bold mb-4 text-blue-400 font-inter flex items-center gap-2 relative z-10">
                <CheckCircle className="w-5 h-5" />
                Recomendaciones
              </h3>
              <div className="space-y-3 text-sm md:text-base relative z-10">
                {[
                  { text: "Temperatura ideal: 20-24°C", delay: "0s" },
                  { text: "Humedad óptima: 40-60%", delay: "0.1s" },
                  { text: "Ventilar cada 2 horas", delay: "0.2s" },
                  { text: "Mantén consumo en rango eficiente", delay: "0.3s" }
                ].map((rec, index) => (
                  <div
                    key={index}
                    className="recommendation-card p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg flex items-center gap-3"
                    style={{ animationDelay: rec.delay }}
                  >
                    <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-slate-200">{rec.text}</span>
                  </div>
                ))}
              </div>
            </SimpleCard>
          </div>
        </div>

        <div
          className={`transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            activeTab === "seguridad" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none absolute top-0 left-0 w-full"
          }`}
          role="tabpanel"
          aria-hidden={activeTab !== "seguridad"}
        >
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <h3 className="text-xl md:text-2xl font-bold text-yellow-300 font-inter flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Controles de Seguridad
            </h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSystemCardVisible(!isSystemCardVisible)}
                className="toggle-card-button px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm md:text-base bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg"
                aria-label={isSystemCardVisible ? "Ocultar Sistema Armado" : "Mostrar Sistema Armado"}
              >
                {isSystemCardVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {isSystemCardVisible ? "Ocultar" : "Mostrar"}
              </button>
              <button
                onClick={toggleAllDevices}
                className={`toggle-all-button px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm md:text-base ${
                  allDevicesOn ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-green-500 to-teal-500'
                } text-white shadow-lg`}
                aria-label={allDevicesOn ? "Desactivar Todo" : "Activar Todo"}
              >
                <Power className="w-4 h-4" />
                {allDevicesOn ? "Desactivar Todo" : "Activar Todo"}
              </button>
            </div>
          </div>
          <h4 className="text-lg md:text-xl font-bold mb-4 text-green-400 font-inter flex items-center gap-2">
            <Lock className="w-5 h-5" /> 
            Sistema Armado
          </h4>
          {shouldRenderSystemCard && (
            <SimpleCard className="system-card p-4 bg-black/50 rounded-xl shadow-lg backdrop-blur-sm mb-4 relative">
              <div className="flex justify-between items-center mb-3">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-button w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-yellow-600/20 to-amber-600/20"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm md:text-base font-bold text-yellow-300">Página {currentPage} de 3</span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === 3}
                  className="pagination-button w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-yellow-600/20 to-amber-600/20"
                  aria-label="Next Page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="page-transition">
                <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2`}>
                  {(currentPage === 1 ? devicesPage1 : currentPage === 2 ? devicesPage2 : devicesPage3).map((device, index) => {
                    const globalIndex = getGlobalIndex(currentPage, index)
                    return (
                      <div
                        key={index}
                        className={`security-card device-card relative p-2 bg-gradient-to-br from-yellow-600/20 to-amber-600/20 rounded-lg shadow-md ${deviceStates[globalIndex] ? 'glow-effect' : ''}`}
                      >
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <div className={`w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center ${deviceStates[globalIndex] ? 'active-pulse' : ''}`}>
                            <device.icon className="w-5 h-5 text-white" />
                          </div>
                          <label className={`toggle-switch ${deviceStates[globalIndex] ? 'toggle-switch-on' : 'toggle-switch-off'}`}>
                            <input
                              type="checkbox"
                              checked={deviceStates[globalIndex]}
                              onChange={() => toggleDevice(globalIndex)}
                              aria-label={deviceStates[globalIndex] ? "Apagar" : "Encender"}
                            />
                            <span className="slider" style={{ width: '40px', height: '24px', borderRadius: '12px' }}>
                              <span
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  left: '3px',
                                  bottom: '3px',
                                  transform: deviceStates[globalIndex] ? 'translateX(16px)' : 'translateX(0)',
                                }}
                              ></span>
                            </span>
                          </label>
                        </div>
                        <h3 className="text-[10px] md:text-xs font-bold text-green-400 text-center leading-tight">{device.title}</h3>
                        <p className="text-[10px] text-gray-300 text-center">{device.status(globalIndex)}</p>
                        <p className="text-[10px] text-yellow-300 text-center">50W</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </SimpleCard>
          )}

          <div className="cameras-section">
            <h4 className="text-lg md:text-xl font-bold mb-4 text-blue-400 font-inter flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Cámaras
            </h4>
            <SimpleCard className="camera-container-card p-6 bg-black/50 rounded-xl shadow-lg backdrop-blur-sm">
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-gradient-to-br ${backgroundColor} p-4 rounded-xl`}>
                <div className={`security-card relative p-4 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-xl shadow-lg ${cameraOn ? 'glow-effect' : ''}`}>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className={`w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center ${cameraOn ? 'active-pulse' : ''}`}>
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                    <button
                      onClick={() => setCameraOn(!cameraOn)}
                      className={`power-button w-12 h-12 rounded-full flex items-center justify-center text-white ${cameraOn ? 'power-button-on' : 'power-button-off'}`}
                      aria-label={cameraOn ? "Apagar" : "Encender"}
                    >
                      <Power className="w-6 h-6" />
                    </button>
                  </div>
                  <h3 className="text-sm md:text-base font-bold mb-1 text-blue-400 text-center">Cámaras</h3>
                  <p className="text-xs md:text-sm text-gray-300 text-center">{cameraOn ? 'Encendido' : 'Apagado'}</p>
                  <p className="text-xs md:text-sm text-yellow-300 text-center">500W</p>
                </div>

                <div className="security-card relative p-4 bg-gradient-to-br from-red-800/20 to-rose-800/20 rounded-xl shadow-lg">
                  <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-sm md:text-base font-bold mb-1 text-yellow-400 text-center">Alertas</h3>
                  <p className="text-md md:text-lg font-bold text-green-400 text-center">0 Activas</p>
                  <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                    <div className="absolute w-full h-full bg-gradient-to-r from-red-500/10 to-rose-500/10 animate-pulse opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              </div>
            </SimpleCard>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-4">
              <div className={`camera-transition camera-item ${cameraOn ? 'camera-on' : 'camera-off'}`}>
                <SimpleSecurityCamera cameraOn={cameraOn} location="Entrada Principal" />
              </div>
              <div className={`camera-transition camera-item ${cameraOn ? 'camera-on' : 'camera-off'}`}>
                <SimpleSecurityCamera cameraOn={cameraOn} location="Sala de Estar" />
              </div>
              <div className={`camera-transition camera-item ${cameraOn ? 'camera-on' : 'camera-off'}`}>
                <SimpleSecurityCamera cameraOn={cameraOn} location="Jardín Trasero" />
              </div>
              <div className={`camera-transition camera-item ${cameraOn ? 'camera-on' : 'camera-off'}`}>
                <SimpleSecurityCamera cameraOn={cameraOn} location="Garaje" />
              </div>
              <div className={`camera-transition camera-item ${cameraOn ? 'camera-on' : 'camera-off'}`}>
                <SimpleSecurityCamera cameraOn={cameraOn} location="Cocina" />
              </div>
              <div className={`camera-transition camera-item ${cameraOn ? 'camera-on' : 'camera-off'}`}>
                <SimpleSecurityCamera cameraOn={cameraOn} location="Pasillo" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}