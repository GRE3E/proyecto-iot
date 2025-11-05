"use client";
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

// === Modelo GLB ===
export function Model({ src, wireframe }: { src: string; wireframe: boolean }) {
  const gltf = useGLTF(src, true) as any;
  const ref = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.traverse((child: any) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => (m.wireframe = wireframe));
        } else {
          child.material.wireframe = wireframe;
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [wireframe]);

  return <primitive ref={ref} object={gltf.scene} dispose={null} />;
}

// === Luces, sombras y helpers de escena ===
export function SceneHelpers({
  modelRef,
  lightOn,
  securityOn,
  lightIntensity,
  isMobile = false,
}: {
  modelRef: React.RefObject<THREE.Group | null>;
  lightOn: boolean;
  securityOn: boolean;
  lightIntensity: number;
  isMobile?: boolean;
}) {
  const { camera, gl } = useThree();

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  useEffect(() => {
    if (!modelRef.current) return;
    const box = new THREE.Box3().setFromObject(modelRef.current);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    
    // Ajustar distancia según dispositivo
    const distance = isMobile ? size * 0.4 : size * 1.4;
    
    camera.position.set(
      center.x + distance, 
      center.y + distance / 2, 
      center.z + distance
    );
    camera.lookAt(center);
  }, [camera, modelRef, isMobile]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.9} castShadow />
      {lightOn && (
        <>
          <pointLight position={[2, 3, 2]} intensity={lightIntensity} color="#06b6d4" />
          <pointLight position={[-2, 3, -2]} intensity={lightIntensity} color="#a855f7" />
        </>
      )}
      {securityOn && (
        <mesh position={[3, 2, 3]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      )}
    </>
  );
}