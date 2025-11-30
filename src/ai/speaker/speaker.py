import numpy as np
import json
from typing import Optional, Tuple, List
from concurrent.futures import ThreadPoolExecutor
from resemblyzer import VoiceEncoder, preprocess_wav
from src.db.database import get_db
from src.db.models import User
import logging
import asyncio
import torch
from sqlalchemy import select
from src.ai.sound_processor.noise_suppressor import suppress_noise
import os

logger = logging.getLogger("SpeakerRecognitionModule")

class SpeakerRecognitionModule:
    """
Módulo para el reconocimiento de hablantes utilizando resemblyzer y SQLAlchemy para la gestión de usuarios.
Permite registrar nuevos hablantes y identificar hablantes existentes a partir de muestras de audio.
    """
    def __init__(self):
        self.device: str = "cuda" if torch.cuda.is_available() else "cpu"
        self._encoder = VoiceEncoder(device=self.device)
        self._online = True
        self._registered_users: List[User] = []
        self._executor = ThreadPoolExecutor(max_workers=4)
        self.identification_threshold: float = 0.25
        self.registration_threshold: float = 0.2
        self.identification_margin: float = 0.05

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
            denoised_audio_path = suppress_noise(audio_path)
            if denoised_audio_path is None:
                logger.error(f"No se pudo suprimir el ruido del audio: {audio_path}")
                return None
            wav = preprocess_wav(denoised_audio_path)
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
                    
                    if distance < self.registration_threshold:
                        logger.warning(f"La voz proporcionada ya está registrada por el usuario {user.nombre}. No se puede registrar {name}.")
                        return None

                return new_embedding_str
        except Exception as e:
            logger.error(f"Error al registrar hablante: {e}")
            return None
        finally:
            if 'denoised_audio_path' in locals() and denoised_audio_path and os.path.exists(denoised_audio_path):
                os.remove(denoised_audio_path)
                logger.debug(f"Archivo temporal eliminado: {denoised_audio_path}")

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
            denoised_audio_path = suppress_noise(audio_path)
            if denoised_audio_path is None:
                logger.error(f"No se pudo suprimir el ruido del audio: {audio_path}")
                return None
            wav = preprocess_wav(denoised_audio_path)
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

                    if distance < self.registration_threshold:
                        logger.warning(f"La voz proporcionada ya está registrada por el usuario {user.nombre}. No se puede actualizar la voz para el usuario ID {user_id}.")
                        return None

                return new_embedding_str
        except Exception as e:
            logger.error(f"Error al actualizar la voz del hablante para el usuario ID {user_id}: {e}")
            return None
        finally:
            if 'denoised_audio_path' in locals() and denoised_audio_path and os.path.exists(denoised_audio_path):
                os.remove(denoised_audio_path)
                logger.debug(f"Archivo temporal eliminado: {denoised_audio_path}")

    async def _identify_speaker_sync(self, audio_path: str) -> Tuple[Optional[User], Optional[np.ndarray]]:
        """
        Lógica asíncrona para identificar un hablante.
        """
        await self._load_registered_users()
        if not self.is_online():
            logger.warning("El módulo de reconocimiento de hablante está fuera de línea.")
            return None, None
        
        try:
            denoised_audio_path = suppress_noise(audio_path)
            if denoised_audio_path is None:
                logger.error(f"No se pudo suprimir el ruido del audio: {audio_path}")
                return None
            wav = preprocess_wav(denoised_audio_path)
            new_embedding = self._encoder.embed_utterance(wav)
        except Exception as e:
            logger.error(f"Error al generar embedding para el audio: {e}")
            return None, None
        finally:
            if 'denoised_audio_path' in locals() and denoised_audio_path and os.path.exists(denoised_audio_path):
                os.remove(denoised_audio_path)
                logger.debug(f"Archivo temporal eliminado: {denoised_audio_path}")

        if not self._registered_users:
            logger.info("No se encontraron usuarios registrados. Devolviendo solo el embedding generado.")
            return None, new_embedding

        distances = []
        for user in self._registered_users:
            if user.speaker_embedding is None:
                logger.debug(f"Usuario {user.nombre} no tiene speaker_embedding, saltando identificación.")
                continue
            registered_embedding = np.array(json.loads(user.speaker_embedding))
            similarity = np.dot(new_embedding, registered_embedding) / \
                         (np.linalg.norm(new_embedding) * np.linalg.norm(registered_embedding))
            distance = 1 - similarity
            logger.debug(f"Comparando con {user.nombre}: distancia = {distance:.4f}")
            distances.append((user, distance))

        if not distances:
            logger.info("No hay embeddings válidos para identificación.")
            return None, new_embedding

        distances.sort(key=lambda x: x[1])
        logger.debug(f"Top candidatos: {[(u.nombre, f'{d:.4f}') for u, d in distances[:3]]}")
        best_user, best_dist = distances[0]
        second_dist = distances[1][1] if len(distances) > 1 else None

        if best_dist < self.identification_threshold and (second_dist is None or (second_dist - best_dist) >= self.identification_margin):
            logger.info(f"Hablante identificado: {best_user.nombre} (distancia={best_dist:.4f})")
            return best_user, new_embedding
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

    async def register_speaker_multi(self, name: str, audio_paths: List[str], is_owner: bool = False) -> Optional[str]:
        denoised_audio_paths = []
        try:
            for path in audio_paths:
                denoised_path = suppress_noise(path)
                if denoised_path is None:
                    logger.error(f"No se pudo suprimir el ruido del audio: {path}")
                    return None
                denoised_audio_paths.append(denoised_path)

            wavs = [preprocess_wav(p) for p in denoised_audio_paths]
            if hasattr(self._encoder, "embed_speaker"):
                new_embedding = self._encoder.embed_speaker(wavs)
            else:
                parts = [self._encoder.embed_utterance(w) for w in wavs]
                new_embedding = np.mean(parts, axis=0)
            new_embedding_str = json.dumps(new_embedding.tolist())
            async with get_db() as db:
                await self._load_registered_users()
                existing_user_by_name = await db.execute(select(User).filter(User.nombre == name))
                if existing_user_by_name.scalar_one_or_none():
                    return None
                for user in self._registered_users:
                    if user.speaker_embedding is None:
                        continue
                    registered_embedding = np.array(json.loads(user.speaker_embedding))
                    similarity = np.dot(new_embedding, registered_embedding) / (np.linalg.norm(new_embedding) * np.linalg.norm(registered_embedding))
                    distance = 1 - similarity
                    if distance < self.registration_threshold:
                        return None
                return new_embedding_str
        except Exception as e:
            logger.error(f"Error en register_speaker_multi: {e}")
            return None
        finally:
            for dp in denoised_audio_paths:
                if os.path.exists(dp):
                    os.remove(dp)
                    logger.debug(f"Archivo temporal eliminado: {dp}")

    async def update_speaker_voice_multi(self, user_id: int, audio_paths: List[str]) -> Optional[str]:
        denoised_audio_paths = []
        try:
            for path in audio_paths:
                denoised_path = suppress_noise(path)
                if denoised_path is None:
                    logger.error(f"No se pudo suprimir el ruido del audio: {path}")
                    return None
                denoised_audio_paths.append(denoised_path)

            wavs = [preprocess_wav(p) for p in denoised_audio_paths]
            if hasattr(self._encoder, "embed_speaker"):
                new_embedding = self._encoder.embed_speaker(wavs)
            else:
                parts = [self._encoder.embed_utterance(w) for w in wavs]
                new_embedding = np.mean(parts, axis=0)
            new_embedding_str = json.dumps(new_embedding.tolist())
            async with get_db():
                await self._load_registered_users()
                for user in self._registered_users:
                    if user.id == user_id:
                        continue
                    if user.speaker_embedding is None:
                        continue
                    registered_embedding = np.array(json.loads(user.speaker_embedding))
                    similarity = np.dot(new_embedding, registered_embedding) / (np.linalg.norm(new_embedding) * np.linalg.norm(registered_embedding))
                    distance = 1 - similarity
                    if distance < self.registration_threshold:
                        return None
                return new_embedding_str
        except Exception as e:
            logger.error(f"Error en update_speaker_voice_multi: {e}")
            return None
        finally:
            for dp in denoised_audio_paths:
                if os.path.exists(dp):
                    os.remove(dp)
                    logger.debug(f"Archivo temporal eliminado: {dp}")
        