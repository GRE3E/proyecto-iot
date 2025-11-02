"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  Loader,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import SimpleCard from "../components/UI/Card";
import SimpleButton from "../components/UI/Button";
import { Model, SceneHelpers } from "../hooks/useModel3D";
import {
  zoomToFit,
  presets,
  handleSnapshot,
} from "../utils/casa3dUtils";
import * as THREE from "three";
import { Home } from "lucide-react";
import ProfileNotifications from "../components/UI/ProfileNotifications";

export default function Casa3d({
  lightOn = true,
  securityOn = true,
}: {
  lightOn?: boolean;
  securityOn?: boolean;
}) {
  const modelPath = "/models/Coso.glb";
  const groupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<any>(null);

  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [envEnabled, setEnvEnabled] = useState(true);
  const [lightIntensity, setLightIntensity] = useState(1);
  const [autoSpeed, setAutoSpeed] = useState(1.2);
  const [dayTime, setDayTime] = useState(0.5);

  const resetView = () => zoomToFit(groupRef, controlsRef);

  return (
    <div className="p-2 md:p-4 pt-8 md:pt-3 space-y-6 md:space-y-8 font-inter">
      {/* HEADER: Título + Perfil + Notificaciones */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 -mt-1 md:-mt-2 relative">
        {/* Título con ícono */}
        <div className="flex items-center gap-4 -mt-6 md:-mt-7">
          <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/20">
            <Home className="w-8 md:w-10 h-8 md:h-10 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent tracking-tight translate-y-[0px] md:translate-y-[-4px]">
            Casa 3D
          </h2>
        </div>

        {/* PERFIL + NOTIFICACIONES */}
        <ProfileNotifications userName="Usuario" />
      </div>

      {/* CONTENIDO ORIGINAL */}
      <SimpleCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* === Escena 3D === */}
          <div className="flex-1 min-h-[420px] rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
            <Canvas
              shadows={shadowsEnabled}
              camera={{ position: [6, 3.5, 6], fov: 45 }}
              style={{ height: 640 }}
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

          {/* === Panel lateral === */}
          <aside className="w-full md:w-80 flex flex-col gap-3">
            {/* Información */}
            <div className="px-3 py-2 bg-gradient-to-tr from-slate-900/60 to-slate-800/40 rounded-lg shadow-md">
              <h3 className="text-sm font-semibold text-white">
                Vista 3D del modelo
              </h3>
              <p className="text-xs text-slate-300 mt-2">
                Interactúa con el modelo: rotar, hacer zoom y centrar. Usa los
                botones para funciones rápidas.
              </p>
            </div>

            {/* Botones de cámara */}
            <div className="flex gap-2 px-1">
              <button
                onClick={() => presets.top(controlsRef)}
                className="text-xs px-2 py-1 bg-slate-700 rounded"
              >
                Top
              </button>
              <button
                onClick={() => presets.front(controlsRef)}
                className="text-xs px-2 py-1 bg-slate-700 rounded"
              >
                Front
              </button>
              <button
                onClick={() => presets.iso(controlsRef)}
                className="text-xs px-2 py-1 bg-slate-700 rounded"
              >
                Iso
              </button>
            </div>

            {/* Controles de visualización */}
            <div className="flex flex-col gap-2">
              <SimpleButton
                onClick={() => setAutoRotate((s) => !s)}
                active
                className={`w-full flex items-center justify-between px-3 py-2 ${
                  autoRotate ? "bg-cyan-600 text-black" : "bg-slate-700 text-white"
                }`}
              >
                <span>Auto-rotar</span>
                <span className="text-xs">{autoRotate ? "ON" : "OFF"}</span>
              </SimpleButton>

              <SimpleButton
                onClick={() => setWireframe((s) => !s)}
                active
                className={`w-full flex items-center justify-between px-3 py-2 ${
                  wireframe ? "bg-indigo-600 text-white" : "bg-slate-700 text-white"
                }`}
              >
                <span>Wireframe</span>
                <span className="text-xs">{wireframe ? "ON" : "OFF"}</span>
              </SimpleButton>

              <SimpleButton
                onClick={() => setShadowsEnabled((s) => !s)}
                active
                className={`w-full flex items-center justify-between px-3 py-2 ${
                  shadowsEnabled ? "bg-yellow-500 text-black" : "bg-slate-700 text-white"
                }`}
              >
                <span>Sombras</span>
                <span className="text-xs">{shadowsEnabled ? "ON" : "OFF"}</span>
              </SimpleButton>

              <SimpleButton
                onClick={() => setEnvEnabled((s) => !s)}
                active
                className={`w-full flex items-center justify-between px-3 py-2 ${
                  envEnabled ? "bg-emerald-400 text-black" : "bg-slate-700 text-white"
                }`}
              >
                <span>Environment</span>
                <span className="text-xs">{envEnabled ? "ON" : "OFF"}</span>
              </SimpleButton>

              <SimpleButton
                onClick={resetView}
                active
                className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 text-white"
              >
                Reset vista
              </SimpleButton>
            </div>

            {/* Sliders */}
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs text-slate-300">
                Hora del día: <span>{Math.round(dayTime * 24)}:00</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={dayTime}
                onChange={(e) => setDayTime(Number(e.target.value))}
                className="w-full"
              />

              <label className="text-xs text-slate-300">
                Intensidad luces: <span>{lightIntensity.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={lightIntensity}
                onChange={(e) => setLightIntensity(Number(e.target.value))}
                className="w-full"
              />

              <label className="text-xs text-slate-300">
                Vel. auto-rotación: <span>{autoSpeed.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={autoSpeed}
                onChange={(e) => setAutoSpeed(Number(e.target.value))}
                className="w-full"
              />

              <SimpleButton
                onClick={handleSnapshot}
                active
                className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-tr from-emerald-400 to-cyan-500 text-black"
              >
                Capturar imagen
              </SimpleButton>
            </div>

            <div className="mt-auto px-3 py-2 bg-slate-800/40 rounded-lg text-xs text-slate-300">
              <strong>Información:</strong>
              <ul className="list-disc ml-5 mt-2">
                <li>Modelo: Coso.glb</li>
                <li>Soporta rotación, zoom y wireframe.</li>
                <li>Click en el orb de la UI principal para activar el asistente por voz.</li>
              </ul>
            </div>
          </aside>
        </div>
      </SimpleCard>
    </div>
  );
}
