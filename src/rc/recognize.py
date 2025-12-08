"""
Face recognition module.
Handles face detection and recognition from camera or image files.
"""

import cv2
import numpy as np
import face_recognition
import logging
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from collections import OrderedDict

from src.db.database import get_db
from src.db.models import User
from src.rc.constants import (
    DEFAULT_FRAME_WIDTH,
    DEFAULT_FRAME_HEIGHT,
    FRAME_SKIP_COUNT,
    MAX_RECOGNITION_FRAMES,
    DEFAULT_RECOGNITION_TOLERANCE,
    ENCODING_CACHE_MAX_SIZE,
    ENCODING_CACHE_TTL_SECONDS,
    ENCODING_MODEL_HOG,
)
from src.rc.exceptions import FaceNotDetectedError, CameraAccessError
from src.rc.async_utils import run_face_recognition_operation, run_camera_operation
from sqlalchemy import select

logger = logging.getLogger("FaceRecognizer")


class EncodingCache:
    """
    LRU cache for face encodings with time-to-live expiration.
    Reduces database queries for frequently accessed encodings.
    """

    def __init__(
        self,
        max_size: int = ENCODING_CACHE_MAX_SIZE,
        ttl_seconds: int = ENCODING_CACHE_TTL_SECONDS
    ):
        """
        Initialize the encoding cache.

        Args:
            max_size: Maximum number of encodings to cache
            ttl_seconds: Time-to-live for cached encodings in seconds
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, Tuple[np.ndarray, datetime]] = OrderedDict()

    def get(self, key: str) -> Optional[np.ndarray]:
        """
        Retrieve an encoding from cache if it exists and hasn't expired.

        Args:
            key: Cache key (typically user name)

        Returns:
            Cached encoding or None if not found or expired
        """
        if key not in self._cache:
            return None

        encoding, timestamp = self._cache[key]
        
        if self._is_expired(timestamp):
            del self._cache[key]
            return None

        # Move to end (mark as recently used)
        self._cache.move_to_end(key)
        return encoding

    def set(self, key: str, encoding: np.ndarray) -> None:
        """
        Store an encoding in the cache.

        Args:
            key: Cache key (typically user name)
            encoding: Face encoding to cache
        """
        # Remove oldest entry if cache is full
        if len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)

        self._cache[key] = (encoding, datetime.now())
        self._cache.move_to_end(key)

    def clear(self) -> None:
        """Clear all cached encodings."""
        self._cache.clear()
        logger.info("Encoding cache cleared")

    def _is_expired(self, timestamp: datetime) -> bool:
        """Check if a cached entry has expired."""
        return datetime.now() - timestamp > timedelta(seconds=self.ttl_seconds)


class FaceRecognizer:
    """
    Handles face recognition from camera or image files.
    Uses async operations to prevent blocking the event loop.
    """

    def __init__(
        self,
        resize_dim: Tuple[int, int] = (DEFAULT_FRAME_WIDTH, DEFAULT_FRAME_HEIGHT)
    ):
        """
        Initialize the face recognizer.

        Args:
            resize_dim: Dimensions to resize frames to (width, height)
        """
        self.known_face_encodings: List[np.ndarray] = []
        self.known_face_names: List[str] = []
        self.resize_dim = resize_dim
        self.frame_skip = FRAME_SKIP_COUNT
        self.encoding_cache = EncodingCache()
        
        logger.info(f"FaceRecognizer initialized with dimensions {resize_dim}")

    async def load_known_faces(self) -> bool:
        """
        Load known face encodings from the database.
        Uses caching to reduce database queries.

        Returns:
            True if encodings were loaded successfully

        Raises:
            Exception: If database query fails
        """
        try:
            async with get_db() as db:
                query = select(User).filter(User.face_embedding.isnot(None))
                result = await db.execute(query)
                users = result.scalars().all()

                self.known_face_encodings = []
                self.known_face_names = []

                for user in users:
                    # Try to get from cache first
                    cached_encoding = self.encoding_cache.get(user.nombre)
                    
                    if cached_encoding is not None:
                        self.known_face_encodings.append(cached_encoding)
                        self.known_face_names.append(user.nombre)
                        logger.debug(f"Loaded encoding from cache: {user.nombre}")
                        continue

                    # Load from database and cache it
                    if user.face_embedding:
                        encoding = np.frombuffer(user.face_embedding, dtype=np.float64)
                        self.known_face_encodings.append(encoding)
                        self.known_face_names.append(user.nombre)
                        self.encoding_cache.set(user.nombre, encoding)
                        logger.debug(f"Loaded encoding from database: {user.nombre}")

            logger.info(
                f"Loaded {len(self.known_face_names)} face encodings: {self.known_face_names}"
            )
            return True
            
        except Exception as e:
            logger.error(f"Error loading known face encodings: {e}")
            return False

    async def recognize_from_camera(self) -> List[str]:
        """
        Perform face recognition from the default camera.
        Runs camera operations in thread pool to prevent blocking.

        Returns:
            List of recognized user names

        Raises:
            CameraAccessError: If camera cannot be accessed
        """
        def _capture_and_recognize() -> List[str]:
            """Blocking camera capture and recognition logic."""
            cap = cv2.VideoCapture(0)
            
            if not cap or not cap.isOpened():
                raise CameraAccessError(camera_id=0)

            try:
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                cap.set(cv2.CAP_PROP_FPS, 30)

                recognized_users = set()
                frame_count = 0

                while frame_count < MAX_RECOGNITION_FRAMES:
                    ret, frame = cap.read()
                    if not ret:
                        break

                    frame_count += 1
                    
                    # Skip frames to improve performance
                    if frame_count % self.frame_skip != 0:
                        continue

                    frame = cv2.resize(frame, self.resize_dim)
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                    # Detect faces
                    face_locations = face_recognition.face_locations(
                        rgb_frame,
                        model=ENCODING_MODEL_HOG
                    )
                    
                    if not face_locations:
                        continue

                    # Generate encodings for detected faces
                    face_encodings = face_recognition.face_encodings(
                        rgb_frame,
                        face_locations
                    )

                    # Compare with known faces
                    for face_encoding in face_encodings:
                        matches = face_recognition.compare_faces(
                            self.known_face_encodings,
                            face_encoding,
                            tolerance=DEFAULT_RECOGNITION_TOLERANCE
                        )
                        
                        if True in matches:
                            first_match_index = matches.index(True)
                            name = self.known_face_names[first_match_index]
                            recognized_users.add(name)

                return list(recognized_users)
                
            finally:
                cap.release()

        # Run in thread pool to prevent blocking
        recognized = await run_camera_operation(_capture_and_recognize)
        logger.info(f"Recognized users from camera: {recognized}")
        return recognized

    async def recognize_from_image_file(self, image_path: str) -> List[str]:
        """
        Perform face recognition from an image file.
        Runs recognition in thread pool to prevent blocking.

        Args:
            image_path: Path to the image file

        Returns:
            List of recognized user names

        Raises:
            FaceNotDetectedError: If no face is detected in the image
            FileNotFoundError: If image file doesn't exist
        """
        def _recognize_from_file() -> List[str]:
            """Blocking file recognition logic."""
            logger.info(f"Starting recognition from file: {image_path}")

            # Load and validate image
            image = cv2.imread(image_path)
            if image is None:
                raise FileNotFoundError(f"No se pudo cargar la imagen: {image_path}")

            logger.info(f"Image loaded. Original size: {image.shape}")

            # Resize and convert to RGB
            image = cv2.resize(image, self.resize_dim)
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            # Detect faces
            logger.info("Detecting faces in image...")
            face_locations = face_recognition.face_locations(
                rgb_image,
                model=ENCODING_MODEL_HOG
            )

            if not face_locations:
                raise FaceNotDetectedError(source=image_path)

            logger.info(f"Detected {len(face_locations)} face(s) in image")

            # Generate encodings
            face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
            logger.info(f"Generated {len(face_encodings)} encoding(s)")

            recognized_users = set()

            # Compare each detected face with known faces
            for idx, face_encoding in enumerate(face_encodings):
                logger.info(
                    f"Comparing face #{idx + 1} with {len(self.known_face_encodings)} known users..."
                )

                # Calculate distances for debugging
                face_distances = face_recognition.face_distance(
                    self.known_face_encodings,
                    face_encoding
                )
                
                distances_dict = dict(zip(self.known_face_names, face_distances))
                logger.debug(f"Face distances: {distances_dict}")

                # Find matches
                matches = face_recognition.compare_faces(
                    self.known_face_encodings,
                    face_encoding,
                    tolerance=DEFAULT_RECOGNITION_TOLERANCE
                )

                if True in matches:
                    first_match_index = matches.index(True)
                    name = self.known_face_names[first_match_index]
                    distance = face_distances[first_match_index]
                    
                    logger.info(f"MATCH! Recognized user: {name} (distance: {distance:.3f})")
                    recognized_users.add(name)
                else:
                    min_distance = min(face_distances) if face_distances else None
                    logger.warning(
                        f"No match found. Minimum distance: {min_distance:.3f if min_distance else 'N/A'}"
                    )

            result = list(recognized_users)
            logger.info(f"Final result: {result if result else 'No users recognized'}")
            return result

        # Run in thread pool to prevent blocking
        return await run_face_recognition_operation(_recognize_from_file)

    def clear_cache(self) -> None:
        """Clear the encoding cache."""
        self.encoding_cache.clear()
