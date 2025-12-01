import os
import cv2
import time
import asyncio
from typing import Dict, Optional, Iterator, Tuple, Union


class CameraState:
    def __init__(self, camera_id: str, source: Union[int, str], label: str):
        self.id = camera_id
        self.source = source
        self.label = label
        self.capture: Optional[cv2.VideoCapture] = None
        self.active: bool = False
        self.recognition_enabled: bool = False
        self._last_frame_time: float = 0.0


def _parse_source(value: str) -> Union[int, str]:
    try:
        return int(value)
    except ValueError:
        return value


class CameraManager:

    def __init__(self) -> None:
        door_src = os.getenv("DOOR_CAMERA_SOURCE", "0")
        living_src = os.getenv("LIVING_CAMERA_SOURCE", "1")

        self._cameras: Dict[str, CameraState] = {
            "door": CameraState("door", _parse_source(door_src), "Puerta principal"),
            "living": CameraState("living", _parse_source(living_src), "Sala"),
        }

        self._frame_size: Tuple[int, int] = (640, 480)
        self._fps: int = 20

        # Encender por defecto: puerta con reconocimiento, sala sin reconocimiento
        self.start("door", recognition_enabled=True)
        self.start("living", recognition_enabled=False)

    def is_online(self) -> bool:
        return True

    def list_cameras(self) -> Dict[str, Dict]:
        return {
            cam_id: {
                "id": state.id,
                "label": state.label,
                "source": state.source,
                "active": state.active,
                "recognition_enabled": state.recognition_enabled,
            }
            for cam_id, state in self._cameras.items()
        }

    def start(self, camera_id: str, recognition_enabled: Optional[bool] = None) -> bool:
        state = self._cameras.get(camera_id)
        if not state:
            return False

        if state.active and state.capture and state.capture.isOpened():
            if recognition_enabled is not None:
                state.recognition_enabled = bool(recognition_enabled)
            return True

        cap = cv2.VideoCapture(state.source)
        if not cap or not cap.isOpened():
            print(f"ERROR: No se pudo abrir la cámara con la fuente {state.source} para la cámara {camera_id}")
            return False

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self._frame_size[0])
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self._frame_size[1])
        cap.set(cv2.CAP_PROP_FPS, self._fps)

        state.capture = cap
        state.active = True
        if recognition_enabled is not None:
            state.recognition_enabled = bool(recognition_enabled)
        return True

    def stop(self, camera_id: str) -> bool:
        state = self._cameras.get(camera_id)
        if not state:
            return False
        if state.capture:
            try:
                state.capture.release()
            except Exception:
                pass
        state.capture = None
        state.active = False
        return True

    def toggle_recognition(self, camera_id: str, enabled: bool) -> bool:
        state = self._cameras.get(camera_id)
        if not state:
            return False
        state.recognition_enabled = bool(enabled)
        return True

    def get_snapshot(self, camera_id: str) -> Optional[bytes]:
        state = self._cameras.get(camera_id)
        if not state:
            return None

        temp_opened = False
        if not state.active or not state.capture:
            print(f"DEBUG: Cámara {camera_id} no activa o sin captura. Intentando iniciar...")
            if not self.start(camera_id):
                print(f"ERROR: No se pudo iniciar la cámara {camera_id} para el stream.")
                return None
            temp_opened = True

        try:
            ret, frame = state.capture.read()
            if not ret:
                return None
            ok, buf = cv2.imencode('.jpg', frame)
            if not ok:
                return None
            return buf.tobytes()
        finally:
            if temp_opened:
                self.stop(camera_id)

    async def mjpeg_stream(self, camera_id: str) -> Iterator[bytes]:
        state = self._cameras.get(camera_id)
        if not state:
            return

        if not state.active or not state.capture:
            print(f"DEBUG: Cámara {camera_id} no activa o sin captura. Intentando iniciar...")
            if not self.start(camera_id):
                print(f"ERROR: No se pudo iniciar la cámara {camera_id} para el stream.")
                return

        try:
            while state.active and state.capture and state.capture.isOpened():
                ret, frame = state.capture.read()
                if not ret:
                    await asyncio.sleep(0.05)
                    continue

                ok, buf = cv2.imencode('.jpg', frame)
                if not ok:
                    await asyncio.sleep(0.01)
                    continue

                frame_bytes = buf.tobytes()
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")

                # Control de FPS
                now = time.time()
                delay = max(0, (1.0 / self._fps) - (now - state._last_frame_time))
                state._last_frame_time = now
                if delay > 0:
                    await asyncio.sleep(delay)
        finally:
            pass

    async def shutdown(self) -> None:
        for cam_id in list(self._cameras.keys()):
            try:
                self.stop(cam_id)
            except Exception:
                pass

    def scan_indices(self, max_index: int = 5) -> Dict[int, bool]:
        result: Dict[int, bool] = {}
        for idx in range(0, max_index + 1):
            cap = cv2.VideoCapture(idx)
            opened = bool(cap and cap.isOpened())
            result[idx] = opened
            if opened:
                try:
                    cap.release()
                except Exception:
                    pass
        return result

    def get_status(self, camera_id: str) -> Optional[Dict]:
        state = self._cameras.get(camera_id)
        if not state:
            return None
        return {
            "id": state.id,
            "label": state.label,
            "source": state.source,
            "active": state.active,
            "recognition_enabled": state.recognition_enabled,
        }
