"""
Camera manager module.
Handles camera initialization, streaming, and snapshot capture.
"""

import os
import cv2
import time
import asyncio
import logging
from typing import Dict, Optional, Iterator, Tuple, Union

from src.rc.constants import DEFAULT_FRAME_WIDTH, DEFAULT_FRAME_HEIGHT, DEFAULT_FPS
from src.rc.exceptions import CameraAccessError
from src.rc.async_utils import run_camera_operation

logger = logging.getLogger("CameraManager")


class CameraState:
    """
    Represents the state of a single camera.
    """

    def __init__(self, camera_id: str, source: Union[int, str], label: str):
        """
        Initialize camera state.

        Args:
            camera_id: Unique identifier for the camera
            source: Camera source (index or URL)
            label: Human-readable label for the camera
        """
        self.id = camera_id
        self.source = source
        self.label = label
        self.capture: Optional[cv2.VideoCapture] = None
        self.active: bool = False
        self.recognition_enabled: bool = False
        self._last_frame_time: float = 0.0


def _parse_camera_source(value: str) -> Union[int, str]:
    """
    Parse camera source from string to int or keep as string.

    Args:
        value: Camera source value

    Returns:
        Integer camera index or string URL
    """
    try:
        return int(value)
    except ValueError:
        return value


class CameraManager:
    """
    Manages multiple cameras for the smart home system.
    Handles camera initialization, streaming, and snapshot capture.
    """

    def __init__(self) -> None:
        """Initialize the camera manager with configured cameras."""
        door_source = os.getenv("DOOR_CAMERA_SOURCE", "0")
        living_source = os.getenv("LIVING_CAMERA_SOURCE", "1")

        self._cameras: Dict[str, CameraState] = {
            "door": CameraState("door", _parse_camera_source(door_source), "Puerta principal"),
            "living": CameraState("living", _parse_camera_source(living_source), "Sala"),
        }

        self._frame_size: Tuple[int, int] = (DEFAULT_FRAME_WIDTH, DEFAULT_FRAME_HEIGHT)
        self._fps: int = DEFAULT_FPS

        # Start default cameras
        self.start("door", recognition_enabled=True)
        self.start("living", recognition_enabled=False)
        
        logger.info("CameraManager initialized with cameras: %s", list(self._cameras.keys()))

    def is_online(self) -> bool:
        """
        Check if camera manager is online.

        Returns:
            Always True (manager is always available)
        """
        return True

    def list_cameras(self) -> Dict[str, Dict]:
        """
        List all configured cameras and their states.

        Returns:
            Dictionary mapping camera IDs to camera information
        """
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
        """
        Start a camera by ID.

        Args:
            camera_id: ID of the camera to start
            recognition_enabled: Whether to enable face recognition

        Returns:
            True if camera started successfully, False otherwise
        """
        state = self._cameras.get(camera_id)
        if not state:
            logger.warning(f"Camera {camera_id} not found")
            return False

        # If already active, just update recognition setting
        if state.active and state.capture and state.capture.isOpened():
            if recognition_enabled is not None:
                state.recognition_enabled = bool(recognition_enabled)
                logger.info(f"Camera {camera_id} recognition set to {recognition_enabled}")
            return True

        # Initialize camera
        try:
            cap = cv2.VideoCapture(state.source)
            if not cap or not cap.isOpened():
                raise CameraAccessError(
                    camera_id=state.source,
                    message=f"No se pudo abrir la cámara {camera_id} con fuente {state.source}"
                )

            cap.set(cv2.CAP_PROP_FRAME_WIDTH, self._frame_size[0])
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self._frame_size[1])
            cap.set(cv2.CAP_PROP_FPS, self._fps)

            state.capture = cap
            state.active = True
            
            if recognition_enabled is not None:
                state.recognition_enabled = bool(recognition_enabled)

            logger.info(f"Camera {camera_id} started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error starting camera {camera_id}: {e}")
            return False

    def stop(self, camera_id: str) -> bool:
        """
        Stop a camera by ID.

        Args:
            camera_id: ID of the camera to stop

        Returns:
            True if camera stopped successfully, False otherwise
        """
        state = self._cameras.get(camera_id)
        if not state:
            logger.warning(f"Camera {camera_id} not found")
            return False

        if state.capture:
            try:
                state.capture.release()
                logger.info(f"Camera {camera_id} released")
            except Exception as e:
                logger.error(f"Error releasing camera {camera_id}: {e}")

        state.capture = None
        state.active = False
        return True

    def toggle_recognition(self, camera_id: str, enabled: bool) -> bool:
        """
        Toggle face recognition for a camera.

        Args:
            camera_id: ID of the camera
            enabled: Whether to enable recognition

        Returns:
            True if setting was updated, False otherwise
        """
        state = self._cameras.get(camera_id)
        if not state:
            logger.warning(f"Camera {camera_id} not found")
            return False

        state.recognition_enabled = bool(enabled)
        logger.info(f"Camera {camera_id} recognition set to {enabled}")
        return True

    def get_snapshot(self, camera_id: str) -> Optional[bytes]:
        """
        Capture a single frame from a camera.

        Args:
            camera_id: ID of the camera

        Returns:
            JPEG-encoded frame bytes or None if capture failed
        """
        state = self._cameras.get(camera_id)
        if not state:
            logger.warning(f"Camera {camera_id} not found")
            return None

        temp_opened = False
        
        # Start camera if not active
        if not state.active or not state.capture:
            logger.debug(f"Camera {camera_id} not active, starting temporarily")
            if not self.start(camera_id):
                logger.error(f"Failed to start camera {camera_id} for snapshot")
                return None
            temp_opened = True

        try:
            ret, frame = state.capture.read()
            if not ret:
                logger.warning(f"Failed to read frame from camera {camera_id}")
                return None

            success, buffer = cv2.imencode('.jpg', frame)
            if not success:
                logger.warning(f"Failed to encode frame from camera {camera_id}")
                return None

            return buffer.tobytes()
            
        except Exception as e:
            logger.error(f"Error capturing snapshot from camera {camera_id}: {e}")
            return None
            
        finally:
            if temp_opened:
                self.stop(camera_id)

    async def stream_mjpeg_frames(self, camera_id: str) -> Iterator[bytes]:
        """
        Stream MJPEG frames from a camera.
        Runs frame capture in thread pool to prevent blocking.

        Args:
            camera_id: ID of the camera to stream

        Yields:
            MJPEG frame bytes
        """
        state = self._cameras.get(camera_id)
        if not state:
            logger.warning(f"Camera {camera_id} not found")
            return

        # Start camera if not active
        if not state.active or not state.capture:
            logger.debug(f"Camera {camera_id} not active, starting for stream")
            if not self.start(camera_id):
                logger.error(f"Failed to start camera {camera_id} for stream")
                return

        try:
            while state.active and state.capture and state.capture.isOpened():
                # Capture frame in thread pool
                def _read_frame():
                    return state.capture.read()

                ret, frame = await run_camera_operation(_read_frame)
                
                if not ret:
                    await asyncio.sleep(0.05)
                    continue

                # Encode frame
                def _encode_frame():
                    return cv2.imencode('.jpg', frame)

                success, buffer = await run_camera_operation(_encode_frame)
                
                if not success:
                    await asyncio.sleep(0.01)
                    continue

                frame_bytes = buffer.tobytes()
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                )

                # Frame rate limiting
                now = time.time()
                delay = max(0, (1.0 / self._fps) - (now - state._last_frame_time))
                state._last_frame_time = now
                
                if delay > 0:
                    await asyncio.sleep(delay)
                    
        except Exception as e:
            logger.error(f"Error streaming from camera {camera_id}: {e}")

    async def shutdown(self) -> None:
        """Shutdown all cameras gracefully."""
        logger.info("Shutting down camera manager...")
        
        for cam_id in list(self._cameras.keys()):
            try:
                self.stop(cam_id)
            except Exception as e:
                logger.error(f"Error stopping camera {cam_id} during shutdown: {e}")
        
        logger.info("Camera manager shutdown complete")

    def scan_camera_indices(self, max_index: int = 5) -> Dict[int, bool]:
        """
        Scan for available camera indices.

        Args:
            max_index: Maximum camera index to scan

        Returns:
            Dictionary mapping camera indices to availability
        """
        result: Dict[int, bool] = {}
        
        for idx in range(0, max_index + 1):
            cap = cv2.VideoCapture(idx)
            is_available = bool(cap and cap.isOpened())
            result[idx] = is_available
            
            if is_available:
                try:
                    cap.release()
                except Exception as e:
                    logger.warning(f"Error releasing camera {idx} during scan: {e}")
        
        logger.info(f"Camera scan results: {result}")
        return result

    def get_camera_status(self, camera_id: str) -> Optional[Dict]:
        """
        Get the status of a specific camera.

        Args:
            camera_id: ID of the camera

        Returns:
            Camera status dictionary or None if not found
        """
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
