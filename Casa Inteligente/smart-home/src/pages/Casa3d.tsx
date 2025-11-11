"use client"

import { Suspense, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import {
  OrbitControls,
  Html,
  Loader,
  Environment,
  ContactShadows,
} from "@react-three/drei"
import SimpleCard from "../components/UI/Card"
import SimpleButton from "../components/UI/Button"
import PageHeader from "../components/UI/PageHeader"
import { Model, SceneHelpers } from "../hooks/useModel3D"
import {
  zoomToFit,
  presets,
  handleSnapshot,
} from "../utils/casa3dUtils"
import * as THREE from "three"
import { Home, RotateCw, Grid3x3, Lightbulb, Globe, Camera, Zap, Settings2, ArrowUp, Eye, Box } from "lucide-react"

function SwitchToggle({ 
  isOn, 
  onChange, 
  label,
  icon: Icon,
  tooltip = ""
}: { 
  isOn: boolean
  onChange: (value: boolean) => void
  label: string
  icon?: any
  tooltip?: string
}) {
  return (
    <div className="flex flex-col gap-2 group relative">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-cyan-400" />}
        <label className="text-sm font-semibold text-white cursor-help">{label}</label>
        {tooltip && (
          <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 bg-slate-900 border border-cyan-500/50 rounded-lg p-2 text-xs text-slate-300 whitespace-nowrap z-50">
            {tooltip}
          </div>
        )}
      </div>
      <div className="flex gap-2 bg-slate-700/30 backdrop-blur-sm p-1 rounded-lg border border-slate-600/50 hover:border-cyan-500/50 transition-all">
        <button
          onClick={() => onChange(true)}
          className={`flex-1 px-3 py-2 rounded-md font-semibold transition-all duration-300 text-sm ${
            isOn
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/50"
              : "bg-slate-600/30 text-slate-300 hover:bg-slate-600/50"
          }`}
        >
          ON
        </button>
        <button
          onClick={() => onChange(false)}
          className={`flex-1 px-3 py-2 rounded-md font-semibold transition-all duration-300 text-sm ${
            !isOn
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/50"
              : "bg-slate-600/30 text-slate-300 hover:bg-slate-600/50"
          }`}
        >
          OFF
        </button>
      </div>
    </div>
  )
}

function SliderControl({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step,
  icon: Icon,
  format = (v: number) => v.toFixed(2),
  tooltip = ""
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  icon?: any
  format?: (v: number) => string
  tooltip?: string
}) {
  return (
    <div className="space-y-2 group relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-purple-400" />}
          <label className="text-xs font-semibold text-slate-300 cursor-help">
            {label}
          </label>
          {tooltip && (
            <div className="hidden group-hover:block absolute top-full left-0 mt-1 bg-slate-900 border border-cyan-500/50 rounded-lg p-2 text-xs text-slate-300 whitespace-nowrap z-50">
              {tooltip}
            </div>
          )}
        </div>
        <span className="text-xs font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent px-2 py-1 bg-slate-700/50 rounded-md">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2.5 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
      />
    </div>
  )
}

export default function Casa3d({
  lightOn = true,
  securityOn = true,
}: {
  lightOn?: boolean
  securityOn?: boolean
} = {}) {
  const modelPath = "/models/Coso.glb"
  const groupRef = useRef<THREE.Group | null>(null)
  const controlsRef = useRef<any>(null)

  const [autoRotate, setAutoRotate] = useState(true)
  const [wireframe, setWireframe] = useState(false)
  const [shadowsEnabled, setShadowsEnabled] = useState(true)
  const [envEnabled, setEnvEnabled] = useState(true)
  const [lightIntensity] = useState(1)
  const [autoSpeed, setAutoSpeed] = useState(1.2)
  const [dayTime] = useState(0.5)

  const resetView = () => zoomToFit(groupRef, controlsRef)

  return (
    <div className="p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter w-full">
      {/* Header */}
      <PageHeader
        title="Casa 3D"
        icon={<Home className="w-8 md:w-10 h-8 md:h-10 text-white" />}
      />

      {/* CONTENIDO */}
      <SimpleCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Escena 3D Desktop */}
          <div className="hidden md:flex flex-1 rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 h-[680px]">
            <Canvas
              shadows={shadowsEnabled}
              camera={{ position: [6, 3.5, 6], fov: 45 }}
              style={{ height: "100%" }}
            >
              <Suspense fallback={<Html center>Cargando modelo...</Html>}>
                {envEnabled && <Environment preset="city" background={false} />}
                <group ref={groupRef}>
                  <Model src={modelPath} wireframe={wireframe} />
                </group>

                <SceneHelpers
                  modelRef={groupRef}
                  lightOn={lightOn}
                  securityOn={securityOn}
                  lightIntensity={lightIntensity}
                  isMobile={false}
                />

                <OrbitControls
                  ref={controlsRef}
                  enablePan
                  enableZoom
                  enableRotate
                  autoRotate={autoRotate}
                  autoRotateSpeed={autoSpeed}
                />

                {shadowsEnabled && (
                  <ContactShadows
                    rotation-x={Math.PI / 2}
                    position={[0, -0.01, 0]}
                    opacity={0.6}
                    width={4}
                    height={4}
                    blur={2}
                    far={2}
                  />
                )}
              </Suspense>
            </Canvas>
            <Loader />
          </div>

          {/* Escena 3D Mobile */}
          <div className="flex md:hidden flex-1 rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 h-[400px]">
            <Canvas
              shadows={shadowsEnabled}
              camera={{ position: [0, 1.2, 1.5], fov: 45 }}
              style={{ height: "100%" }}
            >
              <Suspense fallback={<Html center>Cargando modelo...</Html>}>
                {envEnabled && <Environment preset="city" background={false} />}
                <group ref={groupRef}>
                  <Model src={modelPath} wireframe={wireframe} />
                </group>

                <SceneHelpers
                  modelRef={groupRef}
                  lightOn={lightOn}
                  securityOn={securityOn}
                  lightIntensity={lightIntensity}
                />

                <OrbitControls
                  ref={controlsRef}
                  enablePan
                  enableZoom
                  enableRotate
                  autoRotate={autoRotate}
                  autoRotateSpeed={autoSpeed}
                />

                {shadowsEnabled && (
                  <ContactShadows
                    rotation-x={Math.PI / 2}
                    position={[0, -0.01, 0]}
                    opacity={0.6}
                    width={4}
                    height={4}
                    blur={2}
                    far={2}
                  />
                )}
              </Suspense>
            </Canvas>
            <Loader />
          </div>

          {/* Panel Lateral */}
          <aside className="w-full md:w-96 flex flex-col gap-2 max-h-[680px] overflow-hidden">
            <SimpleCard className="p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 mb-3">
                <Zap className="w-3 h-3" />
                Vistas Guardadas
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                <SimpleButton
                  onClick={() => presets.top(controlsRef)}
                  active
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm bg-gradient-to-br from-cyan-600/80 to-cyan-500/80 hover:from-cyan-600 hover:to-cyan-500 text-white rounded-lg font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/40 border border-cyan-400/30 hover:scale-105 w-full"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>Top</span>
                </SimpleButton>

                <SimpleButton
                  onClick={() => presets.front(controlsRef)}
                  active
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm bg-gradient-to-br from-purple-600/80 to-purple-500/80 hover:from-purple-600 hover:to-purple-500 text-white rounded-lg font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/40 border border-purple-400/30 hover:scale-105 w-full"
                >
                  <Eye className="w-4 h-4" />
                  <span>Front</span>
                </SimpleButton>

                <SimpleButton
                  onClick={() => presets.iso(controlsRef)}
                  active
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm bg-gradient-to-br from-pink-600/80 to-pink-500/80 hover:from-pink-600 hover:to-pink-500 text-white rounded-lg font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/40 border border-pink-400/30 hover:scale-105 w-full"
                >
                  <Box className="w-4 h-4" />
                  <span>Iso</span>
                </SimpleButton>
              </div>
            </SimpleCard>

            <SimpleCard className="p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 mb-3">
                <Lightbulb className="w-3 h-3" />
                Modo de Visualización
              </p>
              <div className="grid grid-cols-2 gap-3">
                <SwitchToggle
                  isOn={autoRotate}
                  onChange={setAutoRotate}
                  label="Rotación"
                  icon={RotateCw}
                  tooltip="Rotación automática del modelo"
                />

                <SwitchToggle
                  isOn={wireframe}
                  onChange={setWireframe}
                  label="Estructura"
                  icon={Grid3x3}
                  tooltip="Ver armazón de geometría"
                />

                <SwitchToggle
                  isOn={shadowsEnabled}
                  onChange={setShadowsEnabled}
                  label="Sombras"
                  icon={Lightbulb}
                  tooltip="Sombras de contacto"
                />

                <SwitchToggle
                  isOn={envEnabled}
                  onChange={setEnvEnabled}
                  label="Ambiente"
                  icon={Globe}
                  tooltip="Entorno y reflejo"
                />
              </div>
            </SimpleCard>

            <SimpleCard className="p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 mb-4">
                <Settings2 className="w-3 h-3" />
                Configuración de Rotación
              </p>
              <div className="space-y-4">
                <SliderControl
                  label="Velocidad de rotación"
                  value={autoSpeed}
                  onChange={setAutoSpeed}
                  min={0}
                  max={5}
                  step={0.1}
                  icon={RotateCw}
                  format={(v) => `${v.toFixed(1)}x`}
                  tooltip="Ajusta la velocidad de giro automático del modelo"
                />
              </div>
            </SimpleCard>

            <SimpleCard className="p-3">
              <div className="flex gap-2.5">
                <SimpleButton
                  onClick={handleSnapshot}
                  active
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm rounded-lg transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 border border-emerald-400/30 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Capturar
                </SimpleButton>
                <SimpleButton
                  onClick={resetView}
                  active
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500/80 to-purple-500/80 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-sm rounded-lg transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 border border-cyan-400/30 flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-4 h-4" />
                  Centrar
                </SimpleButton>
              </div>
            </SimpleCard>

            <SimpleCard className="p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 mb-3">
                <Zap className="w-3 h-3" />
                Estado Actual
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 rounded-lg border border-cyan-500/30 text-center hover:border-cyan-500/60 transition-all">
                  <p className="text-xs text-cyan-300 font-bold">{autoSpeed.toFixed(1)}x</p>
                  <p className="text-xs text-slate-400 mt-1">Rotación</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-lg border border-purple-500/30 text-center hover:border-purple-500/60 transition-all">
                  <p className="text-xs text-purple-300 font-bold">{(lightIntensity * 100).toFixed(0)}%</p>
                  <p className="text-xs text-slate-400 mt-1">Intensidad</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-pink-500/20 to-pink-500/10 rounded-lg border border-pink-500/30 text-center hover:border-pink-500/60 transition-all">
                  <p className="text-xs text-pink-300 font-bold">{Math.round(dayTime * 24)}</p>
                  <p className="text-xs text-slate-400 mt-1">Hora</p>
                </div>
              </div>
            </SimpleCard>
          </aside>
        </div>
      </SimpleCard>
    </div>
  )
}