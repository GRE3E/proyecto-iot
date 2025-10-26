import * as THREE from "three";

// Zoom automático
export const zoomToFit = (groupRef: any, controlsRef: any) => {
  if (!groupRef.current || !controlsRef.current) return;
  const box = new THREE.Box3().setFromObject(groupRef.current);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());
  const distance = size * 1.2;
  const direction = new THREE.Vector3(1, 1, 1).normalize();
  const newPos = center.clone().add(direction.multiplyScalar(distance));
  const cam = controlsRef.current.object;
  cam.position.copy(newPos);
  controlsRef.current.target.copy(center);
  controlsRef.current.update();
};

// Foco de cámara
export const focusCamera = (controlsRef: any, pos: THREE.Vector3, look: THREE.Vector3) => {
  if (!controlsRef.current) return;
  const cam = controlsRef.current.object;
  cam.position.copy(pos);
  controlsRef.current.target.copy(look);
  controlsRef.current.update();
};

// Presets de cámara
export const presets = {
  top: (controlsRef: any) => focusCamera(controlsRef, new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 0, 0)),
  front: (controlsRef: any) => focusCamera(controlsRef, new THREE.Vector3(0, 3, 8), new THREE.Vector3(0, 1, 0)),
  iso: (controlsRef: any) => focusCamera(controlsRef, new THREE.Vector3(6, 4, 6), new THREE.Vector3(0, 1, 0)),
};

// Captura de imagen
export const handleSnapshot = () => {
  try {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = data;
    a.download = "casa3d-snapshot.png";
    a.click();
  } catch (e) {
    console.warn("Error capturando imagen:", e);
  }
};
