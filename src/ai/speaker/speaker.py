import numpy as np
import json
from typing import Optional, Tuple, List
from concurrent.futures import ThreadPoolExecutor
from resemblyzer import VoiceEncoder, preprocess_wav
from src.db.database import get_db
from src.db.models import User
import logging
import asyncio
from sqlalchemy import select

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
            users = await db.execute(select(User))
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

    async def _register_speaker_sync(self, name: str, audio_path: str, is_owner: bool = False) -> Optional[str]:
        """
        Lógica síncrona para registrar un hablante.
        """
        try:
            wav = preprocess_wav(audio_path)
            new_embedding = self._encoder.embed_utterance(wav)
            new_embedding_str = json.dumps(new_embedding.tolist())
            logger.debug(f"Nuevo embedding generado para {name}: {new_embedding_str}")
            
            async with get_db() as db:
                await self._load_registered_users()

                existing_user_by_name = await db.execute(select(User).filter(User.nombre == name))
                if existing_user_by_name.scalar_one_or_none():
                    logger.warning(f"El usuario \'{name}\' ya está registrado por nombre. No se puede registrar con la misma voz.")
                    return None

                logger.debug(f"Comprobando embeddings duplicados. Usuarios registrados actualmente: {[u.nombre for u in self._registered_users]}")
                for user in self._registered_users:
                    logger.debug(f"Embedding cargado de la base de datos para {user.nombre}: {user.speaker_embedding}")
                    if user.speaker_embedding is None:
                        logger.debug(f"Usuario {user.nombre} no tiene speaker_embedding, saltando comparación.")
                        continue
                    registered_embedding = np.array(json.loads(user.speaker_embedding))
                    similarity = np.dot(new_embedding, registered_embedding) / \
                                 (np.linalg.norm(new_embedding) * np.linalg.norm(registered_embedding))
                    distance = 1 - similarity
                    logger.debug(f"Comparando nuevo embedding con usuario {user.nombre}: distancia = {distance:.4f}")
                    
                    if distance < 0.5:
                        logger.warning(f"La voz proporcionada ya está registrada por el usuario {user.nombre}. No se puede registrar {name}.")
                        return None

                return new_embedding_str
        except Exception as e:
            logger.error(f"Error al registrar hablante: {e}")
            return None

    async def register_speaker(self, name: str, audio_path: str, is_owner: bool = False) -> Optional[str]:
        """
        Registra un nuevo hablante en el sistema.
        Genera un embedding de voz y lo guarda en la base de datos.
        """
        logger.info(f"Registrando hablante: {name}")
        return await self._register_speaker_sync(name, audio_path, is_owner)

    async def update_speaker_voice(self, user_id: int, audio_path: str) -> Optional[str]:
        """
        Actualiza la voz de un hablante existente en el sistema.
        Genera un embedding de voz y lo devuelve si no hay duplicados con otros usuarios.
        """
        logger.info(f"Actualizando voz para el usuario ID: {user_id}")
        try:
            wav = preprocess_wav(audio_path)
            new_embedding = self._encoder.embed_utterance(wav)
            new_embedding_str = json.dumps(new_embedding.tolist())
            logger.debug(f"Nuevo embedding generado para el usuario ID {user_id}: {new_embedding_str}")
            
            async with get_db():
                await self._load_registered_users()

                logger.debug(f"Comprobando embeddings duplicados para el usuario ID {user_id}. Usuarios registrados actualmente: {[u.nombre for u in self._registered_users]}")
                for user in self._registered_users:
                    if user.id == user_id:
                        continue

                    logger.debug(f"Embedding cargado de la base de datos para {user.nombre}: {user.speaker_embedding}")
                    if user.speaker_embedding is None:
                        logger.debug(f"Usuario {user.nombre} no tiene speaker_embedding, saltando comparación.")
                        continue
                    registered_embedding = np.array(json.loads(user.speaker_embedding))
                    similarity = np.dot(new_embedding, registered_embedding) / \
                                 (np.linalg.norm(new_embedding) * np.linalg.norm(registered_embedding))
                    distance = 1 - similarity
                    logger.debug(f"Comparando nuevo embedding con usuario {user.nombre}: distancia = {distance:.4f}")

                    if distance < 0.5:
                        logger.warning(f"La voz proporcionada ya está registrada por el usuario {user.nombre}. No se puede actualizar la voz para el usuario ID {user_id}.")
                        return None

                return new_embedding_str
        except Exception as e:
            logger.error(f"Error al actualizar la voz del hablante para el usuario ID {user_id}: {e}")
            return None

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
            if user.speaker_embedding is None:
                logger.debug(f"Usuario {user.nombre} no tiene speaker_embedding, saltando identificación.")
                continue
            registered_embedding = np.array(json.loads(user.speaker_embedding))
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
        