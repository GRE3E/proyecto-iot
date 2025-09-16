"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, useGLTF } from "@react-three/drei"
import { useRef } from "react"
import type * as THREE from "three"
import React from "react"

function HouseModel({ lightOn, securityOn }: { lightOn: boolean; securityOn: boolean }) {
  const meshRef = useRef<THREE.Group>(null)

  const { scene } = useGLTF("/models/Coso.glb")

  return (
    <group ref={meshRef}>
      <primitive object={scene.clone()} scale={[2, 2, 2]} />

      {/* Luces dinámicas */}
      {lightOn && (
        <>
          <pointLight position={[2, 3, 2]} intensity={1} color="#06b6d4" />
          <pointLight position={[-2, 3, -2]} intensity={1} color="#a855f7" />
          <pointLight position={[0, 4, 0]} intensity={0.8} color="#ec4899" />
        </>
      )}

      {/* Sistema de seguridad */}
      {securityOn && (
        <mesh position={[3, 2, 3]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      )}
    </group>
  )
}

export default React.memo(function HouseModel3D({ lightOn, securityOn }: { lightOn: boolean; securityOn: boolean }) {
  return (
    <div className="w-full h-96 bg-slate-900/30 rounded-xl overflow-hidden border border-slate-600/30">
      <Canvas camera={{ position: [15, 12, 15], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={0.6} />

        <HouseModel lightOn={lightOn} securityOn={securityOn} />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={50}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 1.8}
          autoRotate={false}
          autoRotateSpeed={0.5}
          zoomSpeed={1.2}
          rotateSpeed={0.8}
          panSpeed={0.8}
        />
      </Canvas>
    </div>
  )
})
