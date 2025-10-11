"use client"

import { useState, useEffect } from "react"
import SimpleCard from "../UI/SimpleCard"
import SimpleSecurityCamera from "../widgets/SecurityCamera"
import { Shield, Thermometer, Camera, AlertTriangle, Activity, TrendingUp, Droplets, Zap, Power, CheckCircle, Lock, Brain, DoorClosed, Utensils, ShowerHead, Users, WashingMachine, Grid2X2, ChevronLeft, ChevronRight, Car, FullscreenIcon, ThermometerIcon, MegaphoneIcon, AirVentIcon, FanIcon, LightbulbIcon, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence, type Transition } from "framer-motion"

interface Props {
  temperature: number
  setTemperature: (v: number) => void
  humidity: number
  setHumidity: (v: number) => void
  energyUsage: number
  setEnergyUsage: (v: number) => void
}

export default function MonitoreoSeguridad({ temperature, setTemperature, humidity, setHumidity, energyUsage, setEnergyUsage }: Props) {
  const [activeTab, setActiveTab] = useState<"monitoreo" | "seguridad">("seguridad")
  const [deviceStates, setDeviceStates] = useState<boolean[]>([])
  const [cameraOn, setCameraOn] = useState(false)
  const [backgroundColor, setBackgroundColor] = useState("from-purple-900/30 to-indigo-900/30")
  const [currentPage, setCurrentPage] = useState(1)
  const [allDevicesOn, setAllDevicesOn] = useState(false)
  const [isSystemCardVisible, setIsSystemCardVisible] = useState(true)

  useEffect(() => {
    const updateBackgroundColor = () => {
      const hour = new Date().getHours()
      setBackgroundColor(hour >= 6 && hour < 12 ? "from-yellow-900/30 to-amber-900/30" : hour >= 12 && hour < 18 ? "from-cyan-900/30 to-blue-900/30" : "from-purple-900/30 to-indigo-900/30")
    }
    updateBackgroundColor()
    const interval = setInterval(updateBackgroundColor, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => setDeviceStates(new Array([...devicesPage1, ...devicesPage2, ...devicesPage3].length).fill(false)), [])

  const toggleDevice = (index: number) => setDeviceStates(prev => prev.map((state, i) => i === index ? !state : state))
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

  const handlePageChange = (page: number) => page >= 1 && page <= 3 && setCurrentPage(page)
  const getGlobalIndex = (page: number, index: number) => page === 1 ? index : page === 2 ? devicesPage1.length + index : devicesPage1.length + devicesPage2.length + index

  const pageVariants = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }
  const pageTransitionConfig: Transition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  const panelVariants = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } }
  const panelTransition: Transition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
  const systemCardVariants = { initial: { opacity: 0, height: 0, marginBottom: 0 }, animate: { opacity: 1, height: 'auto', marginBottom: 16 }, exit: { opacity: 0, height: 0, marginBottom: 0 } }
  const systemCardTransition: Transition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] }

  return (
    <div className="font-inter min-h-screen pb-8">
      <style>{`.power-button{width:2.1rem;height:2.1rem;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all .3s ease;box-shadow:0 2px 4px rgba(0,0,0,.2)}.power-button-on{background:linear-gradient(to right,#22c55e,#16a34a)}.power-button-off{background:linear-gradient(to right,#ef4444,#dc2626)}.power-button:hover{transform:scale(1.1)}.power-button:active{transform:scale(.95)}.camera-container-card .power-button{width:3rem;height:3rem}.camera-container-card .power-button-on{background:linear-gradient(to right,#22c55e,#16a34a)}.camera-container-card .power-button-off{background:linear-gradient(to right,#ef4444,#dc2626)}.custom-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;background:#fff;border-radius:50%;cursor:pointer;box-shadow:0 0 8px rgba(255,255,255,.6),0 0 12px rgba(255,255,255,.3);border:2px solid #e2e8f0;transition:all .2s ease}.custom-slider::-moz-range-thumb{width:16px;height:16px;background:#fff;border-radius:50%;cursor:pointer;box-shadow:0 0 8px rgba(255,255,255,.6),0 0 12px rgba(255,255,255,.3);border:2px solid #e2e8f0;transition:all .2s ease}.custom-slider::-ms-thumb{width:16px;height:16px;background:#fff;border-radius:50%;cursor:pointer;box-shadow:0 0 8px rgba(255,255,255,.6),0 0 12px rgba(255,255,255,.3);border:2px solid #e2e8f0;transition:all .2s ease}.custom-slider::-webkit-slider-thumb:hover{box-shadow:0 0 12px rgba(255,255,255,.8),0 0 16px rgba(255,255,255,.4)}.custom-slider::-moz-range-thumb:hover{box-shadow:0 0 12px rgba(255,255,255,.8),0 0 16px rgba(255,255,255,.4)}.custom-slider::-ms-thumb:hover{box-shadow:0 0 12px rgba(255,255,255,.8),0 0 16px rgba(255,255,255,.4)}.energy-value{white-space:nowrap}`}</style>

      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 border-b border-slate-700/30">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight leading-tight">Monitoreo y Seguridad</h2>
        <div className="flex flex-col sm:flex-row gap-0 sm:gap-1 relative border-b border-slate-700/50 w-full" role="tablist" aria-label="Monitoreo y Seguridad Tabs">
          <button onClick={() => setActiveTab("seguridad")} role="tab" aria-selected={activeTab === "seguridad"} className={`min-h-[52px] sm:min-h-[48px] px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 font-medium transition-colors duration-300 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base md:text-lg relative group ${activeTab === "seguridad" ? "text-white" : "text-slate-400 hover:text-white"}`}>
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="text-center sm:text-left leading-tight font-semibold">Seguridad</span>
            {activeTab === "seguridad" && <motion.span layoutId="underline" className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />}
          </button>
          <button onClick={() => setActiveTab("monitoreo")} role="tab" aria-selected={activeTab === "monitoreo"} className={`min-h-[52px] sm:min-h-[48px] px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 font-medium transition-colors duration-300 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base md:text-lg relative group ${activeTab === "monitoreo" ? "text-white" : "text-slate-400 hover:text-white"}`}>
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="text-center sm:text-left leading-tight font-semibold">Monitoreo Ambiental</span>
            {activeTab === "monitoreo" && <motion.span layoutId="underline" className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />}
          </button>
        </div>
      </div>

      <div className="relative mt-4 sm:mt-5 md:mt-6 px-3 sm:px-4 md:px-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} variants={panelVariants} initial="initial" animate="animate" exit="exit" transition={panelTransition} className="space-y-5 sm:space-y-6 md:space-y-7" role="tabpanel" aria-hidden={activeTab !== "monitoreo" && activeTab !== "seguridad"}>
            {activeTab === "monitoreo" ? (
              <div>
                <h3 className="text-xl md:text-2xl font-bold mb-4 text-cyan-300 font-inter flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Indicadores</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-6">
                  <SimpleCard className="p-6 flex flex-col items-center bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
                    <h4 className="text-lg font-semibold text-cyan-300 mb-4">Temperatura</h4>
                    <div className="relative w-40 h-56">
                      <svg viewBox="0 0 120 220" className="w-full h-full drop-shadow-lg">
                        <defs>
                          <linearGradient id="tempGradient" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#06b6d4"/><stop offset="50%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#67e8f9"/></linearGradient>
                          <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0e7490" stopOpacity="0.3"/><stop offset="50%" stopColor="#06b6d4" stopOpacity="0.1"/><stop offset="100%" stopColor="#0e7490" stopOpacity="0.3"/></linearGradient>
                          <filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                        </defs>
                        <ellipse cx="60" cy="205" rx="30" ry="8" fill="black" opacity="0.2"/>
                        <rect x="50" y="25" width="20" height="150" fill="url(#glassGradient)" stroke="#0891b2" strokeWidth="2.5" rx="10"/>
                        <circle cx="60" cy="175" r="28" fill="#0f172a" stroke="#0891b2" strokeWidth="2.5"/>
                        <rect x="54" y="30" width="12" height="148" fill="#0f172a" rx="6"/>
                        <rect x="55" y={20 + (148 - (temperature / 35) * 138)} width="10" height={(temperature / 35) * 128 + 20} fill="url(#tempGradient)" rx="5" filter="url(#glow)"/>
                        <circle cx="60" cy="175" r="20" fill="url(#tempGradient)" filter="url(#glow)"/>
                        <ellipse cx="54" cy="170" rx="8" ry="10" fill="rgba(255,255,255,0.4)"/>
                        <circle cx="52" cy="168" r="3" fill="rgba(255,255,255,0.8)"/>
                        <g stroke="#ffffffff" strokeWidth="0.3">
                          <line x1="82" y1="35" x2="92" y2="35"/><text x="96" y="39" fill="#94a3b8" fontSize="10">35</text>
                          <line x1="82" y1="54" x2="92" y2="54"/><text x="96" y="58" fill="#94a3b8" fontSize="10">30</text>
                          <line x1="82" y1="73" x2="92" y2="73"/><text x="96" y="77" fill="#94a3b8" fontSize="10">25°</text>
                          <line x1="82" y1="92" x2="92" y2="92"/><text x="96" y="96" fill="#94a3b8" fontSize="10">20°</text>
                          <line x1="82" y1="111" x2="92" y2="111"/><text x="96" y="115" fill="#94a3b8" fontSize="10">15°</text>
                          <line x1="82" y1="130" x2="92" y2="130"/><text x="96" y="134" fill="#94a3b8" fontSize="10">10°</text>
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
                          <linearGradient id="waterFill" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#581c87"/><stop offset="30%" stopColor="#7c3aed"/><stop offset="70%" stopColor="#a855f7"/><stop offset="100%" stopColor="#d8b4fe"/></linearGradient>
                          <linearGradient id="dropOutline" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#9333ea"/><stop offset="100%" stopColor="#c084fc"/></linearGradient>
                          <radialGradient id="glowEffect" cx="40%" cy="35%"><stop offset="0%" stopColor="white" stopOpacity="0.9"/><stop offset="40%" stopColor="white" stopOpacity="0.4"/><stop offset="100%" stopColor="white" stopOpacity="0"/></radialGradient>
                          <filter id="softGlow"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                          <clipPath id="dropShape"><path d="M90,30 C90,30 55,65 55,100 C55,122 66,140 90,140 C114,140 125,122 125,100 C125,65 90,30 90,30 Z"/></clipPath>
                        </defs>
                        <ellipse cx="90" cy="155" rx="36" ry="6" fill="black" opacity="0.15"/>
                        <path d="M90,30 C90,30 55,65 55,100 C55,122 66,140 90,140 C114,140 125,122 125,100 C125,65 90,30 90,30 Z" fill="#a855f7" opacity="0.2" filter="blur(12px)"/>
                        <path d="M90,30 C90,30 55,65 55,100 C55,122 66,140 90,140 C114,140 125,122 125,100 C125,65 90,30 90,30 Z" fill="#0f172a" stroke="url(#dropOutline)" strokeWidth="2.5" filter="url(#softGlow)"/>
                        <rect x="50" y={140 - (humidity / 100) * 110} width="80" height={(humidity / 100) * 110} fill="url(#waterFill)" clipPath="url(#dropShape)"/>
                        <g clipPath="url(#dropShape)">
                          <path d={`M50,${140 - (humidity / 100) * 110} Q62,${138 - (humidity / 100) * 110} 70,${140 - (humidity / 100) * 110} T90,${140 - (humidity / 100) * 110} T130,${140 - (humidity / 100) * 110}`} fill="none" stroke="#d8b4fe" strokeWidth="2" opacity="0.7">
                            <animate attributeName="d" values={`M50,${140 - (humidity / 100) * 110} Q62,${138 - (humidity / 100) * 110} 70,${140 - (humidity / 100) * 110} T90,${140 - (humidity / 100) * 110} T130,${140 - (humidity / 100) * 110};M50,${140 - (humidity / 100) * 110} Q62,${142 - (humidity / 100) * 110} 70,${140 - (humidity / 100) * 110} T90,${140 - (humidity / 100) * 110} T130,${140 - (humidity / 100) * 110};M50,${140 - (humidity / 100) * 110} Q62,${138 - (humidity / 100) * 110} 70,${140 - (humidity / 100) * 110} T90,${140 - (humidity / 100) * 110} T130,${140 - (humidity / 100) * 110}`} dur="3s" repeatCount="indefinite"/>
                          </path>
                        </g>
                        <ellipse cx="78" cy="65" rx="18" ry="25" fill="url(#glowEffect)" opacity="0.8"/>
                        <circle cx="100" cy="90" r="6" fill="white" opacity="0.3"/>
                        <circle cx="103" cy="88" r="3" fill="white" opacity="0.5"/>
                        <circle cx="76" cy="55" r="2.5" fill="white" opacity="1"/>
                        <g clipPath="url(#dropShape)">
                          <circle cx="80" cy="120" r="2.5" fill="rgba(255,255,255,0.6)"><animate attributeName="cy" values="120;70" dur="4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0" dur="4s" repeatCount="indefinite"/><animate attributeName="r" values="2.5;1.5" dur="4s" repeatCount="indefinite"/></circle>
                          <circle cx="95" cy="130" r="2" fill="rgba(255,255,255,0.5)"><animate attributeName="cy" values="130;80" dur="3.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0" dur="3.5s" repeatCount="indefinite"/><animate attributeName="r" values="2;1" dur="3.5s" repeatCount="indefinite"/></circle>
                          <circle cx="85" cy="125" r="1.5" fill="rgba(255,255,255,0.4)"><animate attributeName="cy" values="125;75" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0" dur="3s" repeatCount="indefinite"/></circle>
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
                          <linearGradient id="boltFill" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#9f1239"/><stop offset="30%" stopColor="#db2777"/><stop offset="70%" stopColor="#ec4899"/><stop offset="100%" stopColor="#fbcfe8"/></linearGradient>
                          <linearGradient id="boltEdge" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#f472b6"/></linearGradient>
                          <radialGradient id="sparkRadial"><stop offset="0%" stopColor="#fbbf24" stopOpacity="1"/><stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/></radialGradient>
                          <filter id="electricGlow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                          <clipPath id="boltClipPath"><path d="M70,35 L50,90 L63,90 L43,145 L97,88 L83,88 L103,35 Z"/></clipPath>
                        </defs>
                        <ellipse cx="70" cy="165" rx="32" ry="6" fill="black" opacity="0.15"/>
                        <path d="M70,35 L50,90 L63,90 L43,145 L97,98 L83,98 L103,35 Z" fill="#ec4899" opacity="0.15" filter="blur(20px)"/>
                        <path d="M70,35 L50,90 L63,90 L43,145 L97,98 L83,98 L103,35 Z" fill="#f472b6" opacity="0.25" filter="blur(10px)"/>
                        <path d="M70,35 L50,90 L63,90 L43,145 L97,88 L83,88 L103,35 Z" fill="#0f172a" stroke="url(#boltEdge)" strokeWidth="3" strokeLinejoin="round" filter="url(#electricGlow)"/>
                        <rect x="45" y={145 - (energyUsage / 500) * 110} width="75" height={(energyUsage / 500) * 110} fill="url(#boltFill)" clipPath="url(#boltClipPath)"/>
                        <g opacity="0.9">
                          <path d="M93,45 L90,52" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"><animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.8s" repeatCount="indefinite"/></path>
                          <path d="M87,60 L84,70" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"><animate attributeName="opacity" values="0.8;0.2;0.8" dur="1s" repeatCount="indefinite"/></path>
                          <path d="M57,80 L55,88" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"><animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.9s" repeatCount="indefinite"/></path>
                          <path d="M90,105 L87,115" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"><animate attributeName="opacity" values="0.9;0.2;0.9" dur="0.7s" repeatCount="indefinite"/></path>
                        </g>
                        <circle cx="93" cy="50" r="5" fill="url(#sparkRadial)"><animate attributeName="r" values="5;9;5" dur="1s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite"/></circle>
                        <circle cx="53" cy="85" r="4" fill="url(#sparkRadial)"><animate attributeName="r" values="4;7;4" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.2s" repeatCount="indefinite"/></circle>
                        <circle cx="90" cy="110" r="4.5" fill="url(#sparkRadial)"><animate attributeName="r" values="4.5;8;4.5" dur="0.9s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.3;1" dur="0.9s" repeatCount="indefinite"/></circle>
                        <circle cx="90" cy="65" r="2" fill="#fbbf24" opacity="0.8"><animate attributeName="cy" values="65;55;65" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/></circle>
                        <circle cx="55" cy="95" r="1.5" fill="#fbbf24" opacity="0.7"><animate attributeName="cy" values="95;88;95" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.8s" repeatCount="indefinite"/></circle>
                        <circle cx="85" cy="125" r="1.8" fill="#fbbf24" opacity="0.9"><animate attributeName="cy" values="125;118;125" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.5s" repeatCount="indefinite"/></circle>
                        <path d="M93,40 L97,38" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.6"><animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite"/></path>
                        <path d="M55,92 L51,94" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.5"><animate attributeName="opacity" values="0.5;0;0.5" dur="1.3s" repeatCount="indefinite"/></path>
                      </svg>
                    </div>
                    <div className="text-center mt-4">
                      <div className="text-5xl font-bold text-pink-400 drop-shadow-lg energy-value">{energyUsage} <span className="text-2xl inline">kWh</span></div>
                      <div className="text-sm text-slate-400 mt-2">Máximo: 500 kWh</div>
                    </div>
                  </SimpleCard>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                  <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-50 animate-pulse"></div>
                    <h4 className="text-base md:text-lg font-bold mb-4 text-cyan-400 font-inter flex items-center gap-2 relative z-10"><Thermometer className="w-4 h-4" /> Control de Temperatura</h4>
                    <div className="flex items-center gap-4 relative z-10">
                      <input type="range" min="10" max="35" value={temperature} onChange={(e) => setTemperature(Number.parseInt(e.target.value))} className="w-full h-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg appearance-none cursor-pointer custom-slider" style={{ background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(temperature - 10) / (35 - 10) * 100}%, #1e293b ${(temperature - 10) / (35 - 10) * 100}%, #1e293b 100%)` }} />
                      <span className={`text-lg font-semibold text-cyan-300 slider-value ${temperature ? 'slider-value-changed' : ''}`}>{temperature}°C</span>
                    </div>
                    <div className="text-sm text-slate-400 mt-2 relative z-10">Rango: 10°C - 35°C</div>
                  </SimpleCard>
                  <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-purple-900/20 to-pink-900/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-50 animate-pulse"></div>
                    <h4 className="text-base md:text-lg font-bold mb-4 text-purple-400 font-inter flex items-center gap-2 relative z-10"><Droplets className="w-4 h-4" /> Control de Humedad</h4>
                    <div className="flex items-center gap-4 relative z-10">
                      <input type="range" min="20" max="80" value={humidity} onChange={(e) => setHumidity(Number.parseInt(e.target.value))} className="w-full h-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg appearance-none cursor-pointer custom-slider" style={{ background: `linear-gradient(to right, #9333ea 0%, #9333ea ${(humidity - 20) / (80 - 20) * 100}%, #1e293b ${(humidity - 20) / (80 - 20) * 100}%, #1e293b 100%)` }} />
                      <span className={`text-lg font-semibold text-purple-300 slider-value ${humidity ? 'slider-value-changed' : ''}`}>{humidity}%</span>
                    </div>
                    <div className="text-sm text-slate-400 mt-2 relative z-10">Rango: 20% - 80%</div>
                  </SimpleCard>
                  <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-pink-900/20 to-rose-900/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 opacity-50 animate-pulse"></div>
                    <h4 className="text-base md:text-lg font-bold mb-4 text-pink-400 font-inter flex items-center gap-2 relative z-10"><Zap className="w-4 h-4" /> Control de Energía</h4>
                    <div className="flex items-center gap-4 relative z-10">
                      <input type="range" min="100" max="500" value={energyUsage} onChange={(e) => setEnergyUsage(Number.parseInt(e.target.value))} className="w-full h-3 bg-gradient-to-r from-pink-600 to-rose-600 rounded-lg appearance-none cursor-pointer custom-slider" style={{ background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${(energyUsage - 100) / (500 - 100) * 100}%, #1e293b ${(energyUsage - 100) / (500 - 100) * 100}%, #1e293b 100%)` }} />
                      <span className={`text-lg font-semibold text-pink-300 slider-value ${energyUsage ? 'slider-value-changed' : ''}`}>{energyUsage} kWh</span>
                    </div>
                    <div className="text-sm text-slate-400 mt-2 relative z-10">Rango: 100 kWh - 500 kWh</div>
                  </SimpleCard>
                </div>
                <div className="grid grid-cols-1 gap-4 md:gap-6">
                  <SimpleCard className="p-4 md:p-6 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-50 animate-pulse"></div>
                    <h3 className="text-lg md:text-xl font-bold mb-4 text-blue-400 font-inter flex items-center gap-2 relative z-10"><CheckCircle className="w-5 h-5" /> Recomendaciones</h3>
                    <div className="space-y-3 text-sm md:text-base relative z-10">
                      {[{ text: "Temperatura ideal: 20-24°C", delay: "0s" }, { text: "Humedad óptima: 40-60%", delay: "0.1s" }, { text: "Ventilar cada 2 horas", delay: "0.2s" }, { text: "Mantén consumo en rango eficiente", delay: "0.3s" }].map((rec, index) => (
                        <div key={index} className="recommendation-card p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg flex items-center gap-3" style={{ animationDelay: rec.delay }}>
                          <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          <span className="text-slate-200">{rec.text}</span>
                        </div>
                      ))}
                    </div>
                  </SimpleCard>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <h3 className="text-xl md:text-2xl font-bold text-yellow-300 font-inter flex items-center gap-2"><Shield className="w-5 h-5" /> Controles de Seguridad</h3>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setIsSystemCardVisible(!isSystemCardVisible)} className="toggle-card-button px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm md:text-base bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg" aria-label={isSystemCardVisible ? "Ocultar Sistema Armado" : "Mostrar Sistema Armado"}>{isSystemCardVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} {isSystemCardVisible ? "Ocultar" : "Mostrar"}</button>
                    <button onClick={toggleAllDevices} className={`toggle-all-button px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm md:text-base ${allDevicesOn ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-green-500 to-teal-500'} text-white shadow-lg`} aria-label={allDevicesOn ? "Desactivar Todo" : "Activar Todo"}><Power className="w-4 h-4" /> {allDevicesOn ? "Desactivar Todo" : "Activar Todo"}</button>
                  </div>
                </div>
                <h4 className="text-lg md:text-xl font-bold mb-4 text-green-400 font-inter flex items-center gap-2"><Lock className="w-5 h-5" /> Sistema Armado</h4>
                <AnimatePresence>
                  {isSystemCardVisible && (
                    <motion.div variants={systemCardVariants} initial="initial" animate="animate" exit="exit" transition={systemCardTransition}>
                      <SimpleCard className="system-card p-4 bg-black/50 rounded-xl shadow-lg backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-3">
                          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="pagination-button w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-yellow-600/20 to-amber-600/20" aria-label="Previous Page"><ChevronLeft className="w-5 h-5" /></button>
                          <span className="text-sm md:text-base font-bold text-yellow-300">Página {currentPage} de 3</span>
                          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === 3} className="pagination-button w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-yellow-600/20 to-amber-600/20" aria-label="Next Page"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div key={currentPage} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransitionConfig} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {(currentPage === 1 ? devicesPage1 : currentPage === 2 ? devicesPage2 : devicesPage3).map((device, index) => {
                              const globalIndex = getGlobalIndex(currentPage, index)
                              return (
                                <div key={index} className={`security-card device-card relative p-2 bg-gradient-to-br from-yellow-600/20 to-amber-600/20 rounded-lg shadow-md ${deviceStates[globalIndex] ? 'glow-effect' : ''}`}>
                                  <div className="flex items-center justify-center gap-2 mb-1">
                                    <div className={`w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center ${deviceStates[globalIndex] ? 'active-pulse' : ''}`}>
                                      <device.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <button onClick={() => toggleDevice(globalIndex)} className={`power-button flex items-center justify-center text-white ${deviceStates[globalIndex] ? 'power-button-on' : 'power-button-off'}`} aria-label={deviceStates[globalIndex] ? "Apagar" : "Encender"}><Power className="w-5 h-5" /></button>
                                  </div>
                                  <h3 className="text-[10px] md:text-xs font-bold text-green-400 text-center leading-tight">{device.title}</h3>
                                  <p className="text-[10px] text-gray-300 text-center">{device.status(globalIndex)}</p>
                                  <p className="text-[10px] text-yellow-300 text-center">50W</p>
                                </div>
                              )
                            })}
                          </motion.div>
                        </AnimatePresence>
                      </SimpleCard>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="cameras-section">
                  <h4 className="text-lg md:text-xl font-bold mb-4 text-blue-400 font-inter flex items-center gap-2"><Camera className="w-5 h-5" /> Cámaras</h4>
                  <SimpleCard className="camera-container-card p-6 bg-black/50 rounded-xl shadow-lg backdrop-blur-sm">
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-gradient-to-br ${backgroundColor} p-4 rounded-xl`}>
                      <div className={`security-card relative p-4 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-xl shadow-lg ${cameraOn ? 'glow-effect' : ''}`}>
                        <div className="flex items-center justify-center gap-3 mb-2">
                          <div className={`w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center ${cameraOn ? 'active-pulse' : ''}`}>
                            <Camera className="w-8 h-8 text-white" />
                          </div>
                          <button onClick={() => setCameraOn(!cameraOn)} className={`power-button flex items-center justify-center text-white ${cameraOn ? 'power-button-on' : 'power-button-off'}`} aria-label={cameraOn ? "Apagar" : "Encender"}><Power className="w-6 h-6" /></button>
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
                    {["Entrada Principal", "Sala de Estar", "Jardín Trasero", "Garaje", "Cocina", "Pasillo"].map((location, index) => (
                      <div key={index} className={`camera-transition camera-item ${cameraOn ? 'camera-on' : 'camera-off'}`}>
                        <SimpleSecurityCamera cameraOn={cameraOn} location={location} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}