"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html, Loader, useProgress, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import SimpleCard from "../UI/SimpleCard";
import SimpleButton from "../UI/SimpleButton";


function Model({ src, wireframe }: { src: string; wireframe: boolean }) {
  const gltf = useGLTF(src, true) as any;
  const ref = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    // apply wireframe toggle to all materials
    ref.current.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mat = child.material as THREE.Material & { wireframe?: boolean };
        // if material is an array (multi-material), set each
        if (Array.isArray(mat)) {
          mat.forEach((m: any) => (m.wireframe = wireframe));
        } else {
          // @ts-ignore
          mat.wireframe = wireframe;
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [wireframe]);

  return <primitive ref={ref} object={gltf.scene} dispose={null} />;
}

function SceneHelpers({ modelRef, lightOn, securityOn, lightIntensity }: { modelRef: React.RefObject<THREE.Group | null>; lightOn: boolean; securityOn: boolean; lightIntensity: number }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  // center the camera on mount if model exists
  useEffect(() => {
    if (!modelRef.current) return;
    const box = new THREE.Box3().setFromObject(modelRef.current);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    const distance = size * 1.4;
    camera.position.set(center.x + distance, center.y + distance / 2, center.z + distance);
    camera.lookAt(center);
  }, [camera, modelRef]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.9} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-10, -5, -5]} intensity={0.3} />

      {/* Dynamic point lights borrowed from HouseModel3D */}
      {lightOn && (
        <>
          <pointLight position={[2, 3, 2]} intensity={lightIntensity} color="#06b6d4" />
          <pointLight position={[-2, 3, -2]} intensity={lightIntensity} color="#a855f7" />
          <pointLight position={[0, 4, 0]} intensity={Math.max(0.2, lightIntensity * 0.8)} color="#ec4899" />
        </>
      )}

      {/* Security indicator */}
      {securityOn && (
        <mesh position={[3, 2, 3]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0b1220" metalness={0.2} roughness={0.8} />
      </mesh>
    </>
  );
}

function Progress() {
  const { progress } = useProgress();
  return <Html center>{Math.round(progress)}% cargando modelo...</Html>;
}

export default function Casa3d({ lightOn = true, securityOn = true }: { lightOn?: boolean; securityOn?: boolean }) {
  const modelPath = "/models/Coso.glb"; // public/models/Coso.glb
  const groupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  // grid removed; keep immersive controls
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [envEnabled, setEnvEnabled] = useState(true);
  const [lightIntensity, setLightIntensity] = useState(1);
  const [autoSpeed, setAutoSpeed] = useState(1.2);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [dayTime, setDayTime] = useState(0.5); // 0..1 representing 0:00..24:00

  // helper: zoom to fit
  const zoomToFit = () => {
    if (!groupRef.current || !controlsRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    const fitOffset = 1.2;
    const distance = size * fitOffset;
    const direction = new THREE.Vector3(1, 1, 1).normalize();
    const newPos = center.clone().add(direction.multiplyScalar(distance));
    const cam = controlsRef.current.object; // camera
    cam.position.copy(newPos);
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  // camera presets
  const focusCamera = (pos: THREE.Vector3, look: THREE.Vector3) => {
    if (!controlsRef.current) return;
    const cam = controlsRef.current.object;
    cam.position.copy(pos);
    controlsRef.current.target.copy(look);
    controlsRef.current.update();
  };

  const presets = {
    top: () => focusCamera(new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 0, 0)),
    front: () => focusCamera(new THREE.Vector3(0, 3, 8), new THREE.Vector3(0, 1, 0)),
    iso: () => focusCamera(new THREE.Vector3(6, 4, 6), new THREE.Vector3(0, 1, 0)),
  };

  const resetView = () => {
    // simply zoom to fit as reset
    zoomToFit();
  };

  return (
    <SimpleCard className="p-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 min-h-[420px] rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
          <div ref={canvasRef}>
          <Canvas shadows={shadowsEnabled} camera={{ position: [6, 3.5, 6], fov: 45 }} style={{ height: 640 }}>
            <Suspense fallback={<Progress />}>
              {envEnabled && <Environment preset="city" background={false} />}
              <group ref={groupRef}>
                <Model src={modelPath} wireframe={wireframe} />
              </group>
              <SceneHelpers modelRef={groupRef} lightOn={lightOn} securityOn={securityOn} lightIntensity={lightIntensity} />
              <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate autoRotate={autoRotate} autoRotateSpeed={autoSpeed} />

              {/* nicer ground: large rounded plane with subtle grid via material */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[400, 400, 64, 64]} />
                <meshStandardMaterial color="#071124" metalness={0.1} roughness={0.9} />
              </mesh>

              {/* optional contact shadow for grounding the model */}
              {shadowsEnabled && <ContactShadows rotation-x={Math.PI / 2} position={[0, -0.01, 0]} opacity={0.6} width={4} height={4} blur={2} far={2} />}
            </Suspense>
          </Canvas>
          </div>
          <Loader />
        </div>

        <aside className="w-full md:w-80 flex flex-col gap-3">
          <div className="px-3 py-2 bg-gradient-to-tr from-slate-900/60 to-slate-800/40 rounded-lg shadow-md">
            <h3 className="text-sm font-semibold text-white">Vista 3D del modelo</h3>
            <p className="text-xs text-slate-300 mt-2">Interactúa con el modelo: rotar, hacer zoom y centrar. Usa los botones para funciones rápidas.</p>
          </div>

          <div className="flex gap-2 px-1">
            <button onClick={() => presets.top()} className="text-xs px-2 py-1 bg-slate-700 rounded">Top</button>
            <button onClick={() => presets.front()} className="text-xs px-2 py-1 bg-slate-700 rounded">Front</button>
            <button onClick={() => presets.iso()} className="text-xs px-2 py-1 bg-slate-700 rounded">Iso</button>
          </div>

          <div className="flex flex-col gap-2">
            <SimpleButton onClick={() => setAutoRotate((s) => !s)} active className={`w-full flex items-center justify-between px-3 py-2 ${autoRotate ? 'bg-cyan-600 text-black' : 'bg-slate-700 text-white'}`}>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12a9 9 0 1 0-3.2 6.7L21 22l-1.8-3.5A9 9 0 0 0 21 12z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Auto-rotar
              </span>
              <span className="text-xs">{autoRotate ? 'ON' : 'OFF'}</span>
            </SimpleButton>

            <SimpleButton onClick={() => setWireframe((s) => !s)} active className={`w-full flex items-center justify-between px-3 py-2 ${wireframe ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'}`}>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h18v18H3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Wireframe
              </span>
              <span className="text-xs">{wireframe ? 'ON' : 'OFF'}</span>
            </SimpleButton>

            <SimpleButton onClick={zoomToFit} active className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-tr from-purple-600 to-pink-500 text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Centrar / Zoom
            </SimpleButton>

            <SimpleButton onClick={() => setShadowsEnabled((s) => !s)} active className={`w-full flex items-center justify-between px-3 py-2 ${shadowsEnabled ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white'}`}>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Sombras
              </span>
              <span className="text-xs">{shadowsEnabled ? 'ON' : 'OFF'}</span>
            </SimpleButton>

            <SimpleButton onClick={() => setEnvEnabled((s) => !s)} active className={`w-full flex items-center justify-between px-3 py-2 ${envEnabled ? 'bg-emerald-400 text-black' : 'bg-slate-700 text-white'}`}>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2 5 5 .5-4 3 1.2 5L12 14l-4.2 1.5L9 10 5 7.5 10 7 12 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Environment
              </span>
              <span className="text-xs">{envEnabled ? 'ON' : 'OFF'}</span>
            </SimpleButton>

            <SimpleButton onClick={resetView} active className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12h3M18 12h3M12 3v3M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.2"/></svg>
              Reset vista
            </SimpleButton>
  </div>
          <div className="flex flex-col gap-2 mt-2">
    <label className="text-xs text-slate-300">Hora del día: <span className="font-mono">{Math.round(dayTime * 24)}:00</span></label>
    <input type="range" min="0" max="1" step="0.01" value={dayTime} onChange={(e) => setDayTime(Number(e.target.value))} className="w-full" />

    <label className="text-xs text-slate-300">Intensidad luces: <span className="font-mono">{lightIntensity.toFixed(2)}</span></label>
    <input type="range" min="0" max="2" step="0.05" value={lightIntensity} onChange={(e) => setLightIntensity(Number(e.target.value))} className="w-full" />

            <label className="text-xs text-slate-300">Vel. auto-rotación: <span className="font-mono">{autoSpeed.toFixed(2)}</span></label>
            <input type="range" min="0" max="5" step="0.1" value={autoSpeed} onChange={(e) => setAutoSpeed(Number(e.target.value))} className="w-full" />

            <SimpleButton onClick={() => {
              // snapshot
              try {
                const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
                if (!canvas) return;
                const data = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = data;
                a.download = 'casa3d-snapshot.png';
                a.click();
              } catch (e) { console.warn(e); }
            }} active className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-tr from-emerald-400 to-cyan-500 text-black">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 7h-3l-2-3H8L6 7H3v13h18V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Capturar imagen
            </SimpleButton>
          </div>

          <div className="mt-auto px-3 py-2 bg-slate-800/40 rounded-lg text-xs text-slate-300">
            <strong>Información:</strong>
            <ul className="list-disc ml-5 mt-2">
              <li>Modelo: <span className="font-medium">Coso.glb</span></li>
              <li>Soporta rotación, zoom y wireframe.</li>
              <li>Click en el orb de la UI principal para activar el asistente por voz (si está configurado).</li>
            </ul>
          </div>
        </aside>
      </div>
    </SimpleCard>
  );
}
