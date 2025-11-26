"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  Loader,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import SimpleCard from "../components/UI/Card";
import { useThemeByTime } from "../hooks/useThemeByTime";
import SimpleButton from "../components/UI/Button";
import PageHeader from "../components/UI/PageHeader";
import { Model, SceneHelpers } from "../hooks/useModel3D";
import { zoomToFit, presets, handleSnapshot } from "../utils/casa3dUtils";
import * as THREE from "three";
import {
  Home,
  RotateCw,
  Grid3x3,
  Lightbulb,
  Globe,
  Camera,
  Zap,
  Settings2,
  ArrowUp,
  Eye,
  Box,
} from "lucide-react";

function SwitchToggle({
  isOn,
  onChange,
  label,
  icon: Icon,
  tooltip = "",
}: {
  isOn: boolean;
  onChange: (value: boolean) => void;
  label: string;
  icon?: any;
  tooltip?: string;
}) {
  const { colors } = useThemeByTime();
  return (
    <div className="flex flex-col gap-2 group relative">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${colors.icon}`} />}
        <label className={`text-sm font-semibold ${colors.text} cursor-help`}>
          {label}
        </label>
        {tooltip && (
          <div className={`hidden group-hover:block absolute bottom-full left-0 mb-2 rounded-lg p-2 text-xs whitespace-nowrap z-50 ${colors.cardBg} ${colors.border} ${colors.text}`}>
            {tooltip}
          </div>
        )}
      </div>
      <div className={`flex gap-2 backdrop-blur-sm p-1 rounded-lg border transition-all ${colors.cardBg} ${colors.border}`}>
        <button
          onClick={() => onChange(true)}
          className={`flex-1 px-3 py-2 rounded-md font-semibold transition-all duration-300 text-sm ${
            isOn
              ? `bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg`
              : `${colors.cardBg} ${colors.text} border ${colors.cardHover}`
          }`}
        >
          ON
        </button>
        <button
          onClick={() => onChange(false)}
          className={`flex-1 px-3 py-2 rounded-md font-semibold transition-all duration-300 text-sm ${
            !isOn
              ? `bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg`
              : `${colors.cardBg} ${colors.text} border ${colors.cardHover}`
          }`}
        >
          OFF
        </button>
      </div>
    </div>
  );
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
  tooltip = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  icon?: any;
  format?: (v: number) => string;
  tooltip?: string;
}) {
  const { colors } = useThemeByTime();
  return (
    <div className="space-y-2 group relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${colors.icon}`} />}
          <label className={`text-xs font-semibold ${colors.mutedText} cursor-help`}>
            {label}
          </label>
          {tooltip && (
            <div className={`hidden group-hover:block absolute top-full left-0 mt-1 rounded-lg p-2 text-xs whitespace-nowrap z-50 ${colors.cardBg} ${colors.border} ${colors.text}`}>
              {tooltip}
            </div>
          )}
        </div>
        <span className={`text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 bg-clip-text text-transparent px-2 py-1 rounded-md`}>
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
        className={`w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all`}
        style={{
          background: `linear-gradient(to right, rgb(34, 197, 94), rgb(168, 85, 247), rgb(236, 72, 153)) 0% / ${(value - min) * 100 / (max - min)}% 100% no-repeat, linear-gradient(to right, rgb(71, 85, 105)) 0% / 100% 100%`
        }}
      />
    </div>
  );
}

export default function Casa3d({
  lightOn = true,
  securityOn = true,
}: {
  lightOn?: boolean;
  securityOn?: boolean;
} = {}) {
  const { colors } = useThemeByTime();
  const modelPath = "/models/Coso.glb";
  const groupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<any>(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [envEnabled, setEnvEnabled] = useState(true);
  const [lightIntensity] = useState(1);
  const [autoSpeed, setAutoSpeed] = useState(1.2);
  
  const resetView = () => zoomToFit(groupRef, controlsRef);

  useEffect(() => {
    const id = setTimeout(() => {
      zoomToFit(groupRef, controlsRef);
    }, 300);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className={`p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter w-full ${colors.background} ${colors.text}`}>
      {/* Header */}
      <PageHeader
        title="Casa 3D"
        icon={<Home className="w-8 md:w-10 h-8 md:h-10 text-white" />}
      />

      {/* CONTENIDO */}
      <SimpleCard className={`p-4 ${colors.cardBg}`}>
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
                  <Model src={modelPath} wireframe={wireframe} onReady={() => zoomToFit(groupRef, controlsRef)} />
                </group>

                <SceneHelpers
                  modelRef={groupRef}
                  lightOn={lightOn}
                  securityOn={securityOn}
                  lightIntensity={lightIntensity}
                  isMobile={false}
                  autoPosition={false}
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
                  <Model src={modelPath} wireframe={wireframe} onReady={() => zoomToFit(groupRef, controlsRef)} />
                </group>

                <SceneHelpers
                  modelRef={groupRef}
                  lightOn={lightOn}
                  securityOn={securityOn}
                  lightIntensity={lightIntensity}
                  autoPosition={false}
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
          <aside className={`w-full md:w-96 flex flex-col gap-2 max-h-[680px] overflow-hidden`}>
            <SimpleCard className={`p-4 ${colors.cardBg}`}>
              <p className={`text-xs font-bold uppercase tracking-widest px-1 flex items-center gap-2 mb-3 ${colors.mutedText}`}>
                <Zap className="w-3 h-3" />
                Vistas Guardadas
              </p>
        <div className="grid grid-cols-3 gap-2.5">
          <SimpleButton
            onClick={() => presets.top(controlsRef)}
            active
            className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg font-semibold transition-all duration-300 hover:scale-105 w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent shadow-indigo-500/20"
          >
            <ArrowUp className="w-4 h-4" />
            <span>Top</span>
          </SimpleButton>

          <SimpleButton
            onClick={() => presets.front(controlsRef)}
            active
            className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg font-semibold transition-all duration-300 hover:scale-105 w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent shadow-indigo-500/20"
          >
            <Eye className="w-4 h-4" />
            <span>Front</span>
          </SimpleButton>

          <SimpleButton
            onClick={() => presets.iso(controlsRef)}
            active
            className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg font-semibold transition-all duration-300 hover:scale-105 w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent shadow-indigo-500/20"
          >
            <Box className="w-4 h-4" />
            <span>Iso</span>
          </SimpleButton>
        </div>
            </SimpleCard>

            <SimpleCard className={`p-4 ${colors.cardBg}`}>
              <p className={`text-xs font-bold uppercase tracking-widest px-1 flex items-center gap-2 mb-3 ${colors.mutedText}`}>
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

            <SimpleCard className={`p-4 ${colors.cardBg}`}>
              <p className={`text-xs font-bold uppercase tracking-widest px-1 flex items-center gap-2 mb-4 ${colors.mutedText}`}>
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

            <SimpleCard className={`p-3 ${colors.cardBg}`}>
          <div className="flex gap-2.5">
            <SimpleButton
              onClick={handleSnapshot}
              active
              className="flex-1 py-3 font-bold text-sm rounded-lg transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-transparent shadow-blue-500/20"
            >
              <Camera className="w-4 h-4" />
              Capturar
            </SimpleButton>
            <SimpleButton
              onClick={resetView}
              active
              className="flex-1 py-3 font-bold text-sm rounded-lg transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-transparent shadow-blue-500/20"
            >
              <RotateCw className="w-4 h-4" />
              Centrar
            </SimpleButton>
          </div>
            </SimpleCard>
          </aside>
        </div>
      </SimpleCard>
    </div>
  );
}