import numpy as np
import json
from typing import Optional, Tuple, List
from concurrent.futures import ThreadPoolExecutor
from resemblyzer import VoiceEncoder, preprocess_wav
from src.db.database import get_db
from src.db.models import User
import logging
import asyncio

logger = logging.getLogger("SpeakerRecognitionModule")

class SpeakerRecognitionModule:
    """
Módulo para el reconocimiento de hablantes utilizando resemblyzer y SQLAlchemy para la gestión de usuarios.
Permite registrar nuevos hablantes y identificar hablantes existentes a partir de muestras de audio.
    """
    def __init__(self):
        self._encoder = VoiceEncoder()
        self._online = True
        self._registered_users: List[User] = []
        self._executor = ThreadPoolExecutor(max_workers=4)

    async def _load_registered_users(self) -> None:
        """
        Carga los usuarios registrados desde la base de datos en la memoria del módulo de forma asíncrona.
        """
        async with get_db() as db:
            users = await db.execute(User.__table__.select())
            self._registered_users = users.scalars().all()
            logger.info(f"Cargados {len(self._registered_users)} usuarios registrados.")

    async def load_users(self) -> None:
        """
        Método asíncrono para cargar los usuarios registrados.
        """
        await self._load_registered_users()

    def is_online(self) -> bool:
        """
        Verifica si el módulo de reconocimiento de hablantes está en línea.
        """
        return self._online

    def shutdown(self) -> None:
        """
        Cierra el ThreadPoolExecutor.
        """
        if self._executor:
            self._executor.shutdown(wait=True)
            logger.info("ThreadPoolExecutor cerrado.")

    async def _register_speaker_sync(self, name: str, audio_path: str, is_owner: bool = False) -> bool:
        """
        Lógica síncrona para registrar un hablante.
        """
        try:
            wav = preprocess_wav(audio_path)
            embedding = self._encoder.embed_utterance(wav)
            
            async with get_db() as db:
                existing_user = await db.execute(User.__table__.select().where(User.nombre == name))
                existing_user = existing_user.scalar_one_or_none()
                if existing_user:
                    logger.info(f"El usuario {name} ya existe. Actualizando embedding.")
                    existing_user.embedding = json.dumps(embedding.tolist())
                    existing_user.is_owner = is_owner
                else:
                    new_user = User(nombre=name, embedding=json.dumps(embedding.tolist()), is_owner=is_owner)
                    db.add(new_user)
                await db.commit()
            await self._load_registered_users()
            return True
        except Exception as e:
            logger.error(f"Error al registrar hablante: {e}")
            return False

    def register_speaker(self, name: str, audio_path: str, is_owner: bool = False):
        """
        Registra un nuevo hablante o actualiza el embedding de un hablante existente de manera asíncrona.
        
        Args:
            name (str): El nombre del hablante a registrar.
            audio_path (str): La ruta al archivo de audio para generar el embedding.
            is_owner (bool): Indica si el hablante es el propietario del sistema.
        
        Returns:
            concurrent.futures.Future: Un objeto Future que representa el resultado de la operación.
        """
        return self._executor.submit(asyncio.run, self._register_speaker_sync(name, audio_path, is_owner))

    async def _identify_speaker_sync(self, audio_path: str) -> Tuple[Optional[User], Optional[np.ndarray]]:
        """
        Lógica asíncrona para identificar un hablante.
        """
        await self._load_registered_users()
        if not self.is_online():
            logger.warning("El módulo de reconocimiento de hablante está fuera de línea.")
            return None, None
        
        try:
            wav = preprocess_wav(audio_path)
            new_embedding = self._encoder.embed_utterance(wav)
        except Exception as e:
            logger.error(f"Error al generar embedding para el audio: {e}")
            return None, None

        if not self._registered_users:
            logger.info("No se encontraron usuarios registrados. Devolviendo solo el embedding generado.")
            return None, new_embedding

        min_dist = float('inf')
        identified_user = None

        for user in self._registered_users:
            registered_embedding = np.array(json.loads(user.embedding))
            similarity = np.dot(new_embedding, registered_embedding) / \
                         (np.linalg.norm(new_embedding) * np.linalg.norm(registered_embedding))
            distance = 1 - similarity
            logger.debug(f"Comparando con {user.nombre}: distancia = {distance:.4f}")
            if distance < min_dist:
                min_dist = distance
                identified_user = user
        
        if identified_user and min_dist < 0.5:
            logger.info(f"Hablante identificado: {identified_user.nombre}")
            return identified_user, new_embedding
        else:
            logger.info("Hablante Desconocido")
            return None, new_embedding

    def identify_speaker(self, audio_path: str):
        """
        Identifica un hablante a partir de una muestra de audio de manera asíncrona.
        
        Args:
            audio_path (str): La ruta al archivo de audio para identificar al hablante.
        
        Returns:
            concurrent.futures.Future: Un objeto Future que representa el resultado de la operación.
        """

        return self._executor.submit(asyncio.run, self._identify_speaker_sync(audio_path))
        