import logging
import json
from datetime import datetime
import threading
from typing import Optional, Dict, Any, Union
from pathlib import Path
import asyncio
import collections

try:
    import yaml
except ImportError:
    yaml = None

from .yt_dlp_extractor import YtDlpExtractor, ExtractorError
from src.websocket.connection_manager import manager as ws_manager
from src.db.database import get_db
from src.db.models import MusicPlayLog
from sqlalchemy import select
from .vlc import VlcBackend
from .mpv import MpvBackend, PlaybackError

logger = logging.getLogger("MusicManager")

class MusicManagerError(Exception):
    """Excepción general para errores del MusicManager."""
    pass


class MusicManager:
    """Gestor principal de reproducción de audio."""
    
    def __init__(self, config_path: Optional[Union[str, Path]] = None):
        """
        Inicializa el MusicManager.
        
        Args:
            config_path: Ruta al archivo de configuración YAML
        """
        self._config = self._load_config(config_path)
        self._extractor = None
        self._backend = None
        self._backend_type = None
        self._current_track = None
        self._queue = []
        self._queue_lock = threading.Lock()
        self._lock = threading.RLock()
        self._initialized = False
        self._main_loop = None
        self._last_added = None
        self._history = collections.deque(maxlen=3)
        self._future_queue = collections.deque()
        self._position_broadcast_enabled = False
        self._position_broadcast_interval = float(self._config.get('music', {}).get('position_broadcast_interval', 2.0))
        self._position_last_sent = -1.0
        
        # Inicializar componentes
        self._initialize()

    def _play_next_in_queue(self):
        """
        Reproduce la siguiente canción en la cola. Este método se ejecuta en un hilo separado
        cuando la canción actual termina.
        """
        with self._queue_lock:
            if not self._queue:
                logger.info("Cola vacía, no hay más canciones para reproducir.")
                with self._lock:
                    if self._current_track:
                        self._history.append(self._current_track)
                    self._current_track = None
                try:
                    self._broadcast_update("stopped")
                except Exception:
                    pass
                return

            next_audio_info = self._queue.pop(0)
            logger.info(f"Reproduciendo siguiente en cola: {next_audio_info['title']}")

        try:
            # Si hay una canción actual, la agregamos al historial antes de reproducir una nueva
            if self._current_track:
                self._history.append(self._current_track)
            self._ensure_loop()
            if self._main_loop is not None:
                fut = asyncio.run_coroutine_threadsafe(
                    self._async_play_from_queue(next_audio_info),
                    self._main_loop
                )
                def _done_cb(f):
                    try:
                        f.result()
                    except Exception as e:
                        logger.error(f"Error al iniciar siguiente en cola: {e}")
                        try:
                            self._current_track = None
                            self._play_next_in_queue()
                        except Exception:
                            pass
                fut.add_done_callback(_done_cb)
            else:
                logger.error("No hay event loop activo para avanzar cola")

        except Exception as e:
            logger.error(f"Error al reproducir la siguiente canción en cola: {e}")
            self._current_track = None
            # Intentar la siguiente canción si falla la actual
            self._play_next_in_queue()

    async def _async_play_from_queue(self, audio_info: Dict[str, Any]):
        """
        Corrutina para reproducir una canción desde la cola en el loop principal.
        """
        try:
            loop = asyncio.get_running_loop()
            success = await loop.run_in_executor(None, self._backend.play, audio_info['url'])
            if not success:
                raise MusicManagerError("No se pudo iniciar la reproducción desde la cola")
            if 'started_at' not in audio_info:
                audio_info['started_at'] = datetime.now().isoformat()
            self._current_track = audio_info
            logger.info(f"Reproducción iniciada desde cola: {audio_info['title']}")
            # Registrar en DB el inicio de reproducción automática
            try:
                async with get_db() as db:
                    entry = MusicPlayLog(
                        user_id=audio_info.get('started_by', {}).get('user_id') if audio_info.get('started_by') else None,
                        user_name=audio_info.get('started_by', {}).get('username') if audio_info.get('started_by') else None,
                        title=audio_info.get('title'),
                        uploader=audio_info.get('uploader'),
                        duration=audio_info.get('duration'),
                        thumbnail=audio_info.get('thumbnail'),
                        backend=self._backend_type,
                        query=audio_info.get('query'),
                        track_url=audio_info.get('url')
                    )
                    db.add(entry)
                    await db.commit()
            except Exception as e:
                logger.warning(f"No se pudo registrar reproducción automática en DB: {e}")
            # Broadcast de actualización
            try:
                self._broadcast_update("playing")
                self._start_position_broadcast()
            except Exception as e:
                logger.warning(f"No se pudo emitir actualización de música: {e}")
        except Exception as e:
            logger.error(f"Error en _async_play_from_queue: {e}")
            raise

    def _ensure_loop(self):
        try:
            if self._main_loop is None or self._main_loop.is_closed():
                try:
                    self._main_loop = asyncio.get_running_loop()
                except RuntimeError:
                    # No hay loop corriendo en este hilo; mantener None
                    self._main_loop = None
        except Exception:
            self._main_loop = None

    def _broadcast_update(self, status: str):
        async def _broadcast_update_async():
            history = []
            try:
                async with get_db() as db:
                    result_hist = await db.execute(
                        select(MusicPlayLog).order_by(MusicPlayLog.started_at.desc()).limit(3)
                    )
                    logs = result_hist.scalars().all()
                    history = [
                        {
                            "id": str(l.id),
                            "title": l.title,
                            "uploader": l.uploader,
                            "duration": l.duration,
                            "thumbnail": l.thumbnail,
                            "query": l.query,
                            "started_at": l.started_at.isoformat() if l.started_at else None,
                            "started_by": {"user_id": l.user_id, "username": l.user_name},
                        }
                        for l in logs
                    ]
            except Exception as e:
                logger.warning(f"No se pudo obtener historial global: {e}")

            payload = {
                "type": "music_update",
                "status": status,
                "current_track": self._current_track,
                "queue": self.get_queue(),
                "history": history,
                "volume": self.get_volume(),
                "position": self.get_position(),
                "duration": self.get_duration(),
            }
            await ws_manager.broadcast(json.dumps(payload, ensure_ascii=False))

        self._ensure_loop()
        if self._main_loop is not None:
            try:
                asyncio.run_coroutine_threadsafe(_broadcast_update_async(), self._main_loop)
            except Exception as e:
                logger.warning(f"Error emitiendo broadcast de música: {e}")

    def _start_position_broadcast(self):
        try:
            self._ensure_loop()
            if self._position_broadcast_enabled:
                return
            self._position_broadcast_enabled = True
            self._position_last_sent = -1.0
            async def _loop():
                try:
                    while self._position_broadcast_enabled:
                        try:
                            if not self.is_playing():
                                await asyncio.sleep(self._position_broadcast_interval)
                                continue
                            if len(ws_manager.active_connections) == 0:
                                await asyncio.sleep(self._position_broadcast_interval)
                                continue
                            pos = self.get_position()
                            dur = self.get_duration()
                            if self._position_last_sent < 0 or abs(pos - self._position_last_sent) >= 1.0:
                                payload = {
                                    "type": "music_update",
                                    "status": "playing",
                                    "current_track": self._current_track,
                                    "queue": self.get_queue(),
                                    "volume": self.get_volume(),
                                    "position": pos,
                                    "duration": dur,
                                }
                                await ws_manager.broadcast(json.dumps(payload, ensure_ascii=False))
                                self._position_last_sent = pos
                            await asyncio.sleep(self._position_broadcast_interval)
                        except Exception:
                            await asyncio.sleep(self._position_broadcast_interval)
                except asyncio.CancelledError:
                    return
            if self._main_loop is not None:
                try:
                    asyncio.run_coroutine_threadsafe(_loop(), self._main_loop)
                except Exception:
                    self._position_broadcast_enabled = False
        except Exception:
            self._position_broadcast_enabled = False

    def _stop_position_broadcast(self):
        try:
            self._position_broadcast_enabled = False
        except Exception:
            pass

    def get_position(self) -> float:
        try:
            return float(self._backend.get_position()) if self._backend else 0.0
        except Exception:
            return 0.0

    def get_duration(self) -> float:
        try:
            # Preferir duración del track si existe
            if self._current_track and self._current_track.get('duration'):
                return float(self._current_track['duration'])
            return float(self._backend.get_duration()) if self._backend else 0.0
        except Exception:
            return 0.0

    async def seek(self, position_seconds: float) -> Dict[str, Any]:
        try:
            loop = asyncio.get_running_loop()
            success = await loop.run_in_executor(None, self._backend.seek, position_seconds)
            if not success:
                logger.warning("Seek no confirmado por backend, continuando y difundiendo posición deseada")
            # Emitir actualización de posición (preferimos la posición del backend si se actualizó)
            self._broadcast_update("position_changed")
            return {
                'status': 'seeked',
                'success': True,
                'position': self.get_position() if success else position_seconds,
                'duration': self.get_duration(),
                'backend': self._backend_type
            }
        except Exception as e:
            logger.error(f"Error en seek: {e}")
            return {
                'status': 'seek_failed',
                'success': False,
                'position': self.get_position(),
                'duration': self.get_duration(),
                'backend': self._backend_type
            }

    def annotate_last_added(self, user_id: int, username: str, query: str | None = None):
        with self._lock:
            now = datetime.now().isoformat()
            if self._last_added:
                self._last_added['started_by'] = { 'user_id': user_id, 'username': username }
                self._last_added['started_at'] = now
                if query:
                    self._last_added['query'] = query
            # también actualizar el último elemento de la cola
            with self._queue_lock:
                if self._queue:
                    self._queue[-1]['started_by'] = { 'user_id': user_id, 'username': username }
                    self._queue[-1]['started_at'] = now
                    if query:
                        self._queue[-1]['query'] = query

    def annotate_current_track(self, user_id: int, username: str, query: str | None = None):
        with self._lock:
            now = datetime.now().isoformat()
            if self._current_track:
                self._current_track['started_by'] = { 'user_id': user_id, 'username': username }
                self._current_track['started_at'] = now
                if query:
                    self._current_track['query'] = query

    
    def _load_config(self, config_path: Optional[Union[str, Path]]) -> Dict[str, Any]:
        default_config = {
            'music': {
                'default_volume': 65,
                'extractor': 'yt_dlp',
                'playback': 'vlc',
                'retry_on_failure': True,
                'retries': 3
            },
            'yt_dlp': {
                'timeout': 30,
                'audio_quality': 'best',
                'audio_format': 'bestaudio'
            }
        }

        if yaml:
            try:
                cfg_path = Path(config_path) if config_path else Path(__file__).parent / 'config.yml'
                if cfg_path.exists():
                    with open(cfg_path, 'r', encoding='utf-8') as f:
                        loaded = yaml.safe_load(f) or {}
                        if 'music' in loaded:
                            default_config['music'].update(loaded['music'])
                        if 'yt_dlp' in loaded:
                            default_config['yt_dlp'].update(loaded['yt_dlp'])
                        return default_config
            except Exception as e:
                logger.warning(f"Error cargando configuración: {e}, usando valores por defecto")

        return default_config
    
    def _initialize(self):
        """Inicializa los componentes del MusicManager."""
        try:
            # Inicializar extractor
            self._initialize_extractor()
            
            # Inicializar backend
            self._initialize_backend()
            
            self._initialized = True
            logger.info("MusicManager inicializado exitosamente")
            
        except Exception as e:
            logger.error(f"Error inicializando MusicManager: {e}")
            raise MusicManagerError(f"Error inicializando MusicManager: {str(e)}")
    
    def _initialize_extractor(self):
        """Inicializa el extractor de audio."""
        try:
            extractor_config = self._config['music']
            timeout = self._config.get('yt_dlp', {}).get('timeout', 30)
            self._extractor = YtDlpExtractor(
                retries=extractor_config.get('retries', 3),
                timeout=timeout
            )
            logger.info("Extractor yt-dlp inicializado")
            
        except ImportError as e:
            logger.error(f"yt-dlp no está instalado: {e}")
            raise MusicManagerError("yt-dlp es requerido. Instala con: pip install yt-dlp")
    
    def _initialize_backend(self):
        """Inicializa el backend de reproducción."""
        backend_type = self._config['music'].get('playback', 'vlc')
        volume = self._config['music'].get('default_volume', 65)
        
        # Intentar VLC primero si está configurado
        if backend_type == 'vlc':
            try:
                self._backend = VlcBackend(volume=volume, song_ended_callback=self._play_next_in_queue)
                self._backend_type = 'vlc'
                logger.info("Backend VLC inicializado")
                return
            except ImportError as e:
                logger.warning(f"VLC no disponible: {e}, intentando mpv")
            except Exception as e:
                logger.warning(f"Error inicializando VLC: {e}, intentando mpv")
        
        # Intentar mpv como fallback
        try:
            self._backend = MpvBackend(volume=volume, song_ended_callback=self._play_next_in_queue)
            self._backend_type = 'mpv'
            logger.info("Backend mpv inicializado")
        except ImportError as e:
            logger.error(f"mpv no disponible: {e}")
            raise MusicManagerError("Ningún backend de reproducción está disponible")
        except Exception as e:
            logger.error(f"Error inicializando mpv: {e}")
            raise MusicManagerError(f"Error inicializando backend: {str(e)}")
    
    async def play(self, query: str) -> Dict[str, Any]:
        """
        Reproduce audio desde YouTube dado un término de búsqueda.
        
        Args:
            query: Término de búsqueda o URL de YouTube
            
        Returns:
            Dict con información de la reproducción
            
        Raises:
            MusicManagerError: Si hay algún error en el proceso
        """
        with self._lock:
            if not self._initialized:
                raise MusicManagerError("MusicManager no está inicializado")
            
            try:
                logger.info(f"Reproduciendo: {query}")
                self._ensure_loop()
                
                # Si ya hay algo reproduciéndose, añadir a la cola
                if self.get_state() != "idle" and self.get_state() != "stopped":
                    logger.info(f"Añadiendo a la cola: {query}")
                    audio_info = await self._extractor.extract_audio(query)
                    audio_info['query'] = query
                    with self._queue_lock:
                        self._queue.append(audio_info)
                    self._last_added = audio_info
                    return {
                        'status': 'queued',
                        'title': audio_info['title'],
                        'uploader': audio_info['uploader'],
                        'duration': audio_info['duration'],
                        'thumbnail': audio_info['thumbnail'],
                        'backend': self._backend_type,
                        'query': query
                    }
                
                # Si hay una canción actual, la agregamos al historial antes de reproducir una nueva
                if self._current_track:
                    self._history.append(self._current_track)
                
                # Extraer información del audio
                logger.info("Extrayendo información del audio...")
                audio_info = await self._extractor.extract_audio(query)
                audio_info['query'] = query
                
                # Reproducir el audio sin bloquear el event loop
                logger.info(f"Reproduciendo: {audio_info['title']}")
                await self._async_play_from_queue(audio_info)
                self._last_added = audio_info
                result = {
                    'status': 'playing',
                    'title': audio_info['title'],
                    'uploader': audio_info['uploader'],
                    'duration': audio_info['duration'],
                    'thumbnail': audio_info['thumbnail'],
                    'backend': self._backend_type,
                    'query': query
                }
                
                logger.info(f"Reproducción iniciada: {audio_info['title']}")
                return result
                
            except ExtractorError as e:
                logger.error(f"Error extrayendo audio: {e}")
                raise MusicManagerError(f"Error extrayendo audio: {str(e)}")
            except PlaybackError as e:
                logger.error(f"Error en reproducción: {e}")
                raise MusicManagerError(f"Error en reproducción: {str(e)}")
            except Exception as e:
                logger.error(f"Error inesperado en play: {e}")
                raise MusicManagerError(f"Error inesperado: {str(e)}")
    
    def pause(self) -> Dict[str, Any]:
        """
        Pausa la reproducción actual.
        
        Returns:
            Dict con estado actual
            
        Raises:
            MusicManagerError: Si hay algún error
        """
        with self._lock:
            try:
                if not self._initialized:
                    raise MusicManagerError("MusicManager no está inicializado")
                
                success = self._backend.pause()
                if success:
                    self._stop_position_broadcast()
                
                return {
                    'status': 'paused' if success else 'error',
                    'success': success,
                    'backend': self._backend_type
                }
                
            except Exception as e:
                logger.error(f"Error pausando: {e}")
                raise MusicManagerError(f"Error pausando: {str(e)}")
    
    def resume(self) -> Dict[str, Any]:
        """
        Reanuda la reproducción pausada.
        
        Returns:
            Dict con estado actual
            
        Raises:
            MusicManagerError: Si hay algún error
        """
        with self._lock:
            try:
                if not self._initialized:
                    raise MusicManagerError("MusicManager no está inicializado")
                
                success = self._backend.resume()
                if success:
                    self._start_position_broadcast()
                
                return {
                    'status': 'playing' if success else 'error',
                    'success': success,
                    'backend': self._backend_type
                }
                
            except Exception as e:
                logger.error(f"Error reanudando: {e}")
                raise MusicManagerError(f"Error reanudando: {str(e)}")
    
    def stop(self) -> Dict[str, Any]:
        """
        Detiene la reproducción actual.
        
        Returns:
            Dict con estado actual
            
        Raises:
            MusicManagerError: Si hay algún error
        """
        with self._lock:
            try:
                if not self._initialized:
                    raise MusicManagerError("MusicManager no está inicializado")
                
                success = self._backend.stop()
                
                # Limpiar pista actual, cola e historial
                if success:
                    self._stop_position_broadcast()
                    self._current_track = None
                    with self._queue_lock:
                        self._queue.clear()
                    self._last_added = None
                    self._history.clear()
                    self._future_queue.clear()
                
                return {
                    'status': 'stopped' if success else 'error',
                    'success': success,
                    'backend': self._backend_type
                }
                
            except Exception as e:
                logger.error(f"Error deteniendo: {e}")
                raise MusicManagerError(f"Error deteniendo: {str(e)}")
    
    def set_volume(self, volume: int) -> Dict[str, Any]:
        """
        Establece el volumen.
        
        Args:
            volume: Volumen (0-100)
            
        Returns:
            Dict con estado actual
            
        Raises:
            MusicManagerError: Si hay algún error
        """
        with self._lock:
            try:
                if not self._initialized:
                    raise MusicManagerError("MusicManager no está inicializado")
                
                success = self._backend.set_volume(volume)
                
                return {
                    'status': 'volume_set' if success else 'error',
                    'success': success,
                    'volume': volume,
                    'backend': self._backend_type
                }
                
            except Exception as e:
                logger.error(f"Error estableciendo volumen: {e}")
                raise MusicManagerError(f"Error estableciendo volumen: {str(e)}")
    
    def get_volume(self) -> int:
        """
        Obtiene el volumen actual.
        
        Returns:
            Volumen actual (0-100)
        """
        with self._lock:
            if not self._initialized:
                return self._config['music'].get('default_volume', 65)
            
            return self._backend.get_volume()
    
    def is_playing(self) -> bool:
        """
        Verifica si está reproduciendo.
        
        Returns:
            True si está reproduciendo
        """
        with self._lock:
            if not self._initialized:
                return False
            
            return self._backend.is_playing()
    
    def get_state(self) -> str:
        """
        Obtiene el estado actual del reproductor.
        
        Returns:
            Estado actual como string
        """
        with self._lock:
            if not self._initialized:
                return "not_initialized"
            
            return self._backend.get_state().value
    
    def get_current_track(self) -> Optional[Dict[str, Any]]:
        """
        Obtiene información de la pista actual.
        
        Returns:
            Dict con información de la pista o None
        """
        with self._lock:
            return self._current_track
    
    def get_queue(self) -> list[Dict[str, Any]]:
        """
        Obtiene la cola de reproducción actual.
        
        Returns:
            Lista de Dicts con información de las canciones en cola.
        """
        with self._queue_lock:
            return list(self._queue)

    def get_history(self) -> list[Dict[str, Any]]:
        with self._lock:
            return list(self._history)

    def get_last_added(self) -> Optional[Dict[str, Any]]:
        """
        Obtiene la última canción agregada a la cola o reproducida directamente.
        
        Returns:
            Dict con información de la última canción agregada o None.
        """
        with self._lock:
            return self._last_added

    async def previous(self) -> Dict[str, Any]:
        """
        Reproduce la canción anterior en el historial.
        
        Returns:
            Dict con información de la reproducción
            
        Raises:
            MusicManagerError: Si no hay historial disponible
        """
        with self._lock:
            threshold = 5.0
            pos = 0.0
            try:
                pos = float(self._backend.get_position())
            except Exception:
                pos = 0.0

            # Si hay pista actual y se superó el umbral, reiniciar la actual
            if self._current_track and pos > threshold:
                logger.info("Reiniciando canción actual (umbral de tiempo superado)")
                self._backend.stop()
                await self._async_play_from_queue(self._current_track)
                return {
                    'status': 'restarting_current',
                    'success': True,
                    'backend': self._backend_type
                }

            # Si no se superó el umbral y hay historial, reproducir la anterior
            if self._history:
                if self._current_track:
                    self._future_queue.appendleft(self._current_track)
                previous_track = self._history.pop()
                logger.info(f"Reproduciendo canción anterior: {previous_track['title']}")
                self._backend.stop()
                await self._async_play_from_queue(previous_track)
                return {
                    'status': 'playing_previous',
                    'success': True,
                    'backend': self._backend_type
                }

            # Si no hay historial pero hay pista actual, reiniciar desde inicio
            if self._current_track:
                logger.info("Reiniciando canción actual desde el inicio (sin historial)")
                self._backend.stop()
                await self._async_play_from_queue(self._current_track)
                return {
                    'status': 'restarting_current',
                    'success': True,
                    'backend': self._backend_type
                }

            # Si no hay nada para retroceder
            raise MusicManagerError("No hay canción actual ni historial para retroceder.")

    async def next(self) -> Dict[str, Any]:
        """
        Reproduce la siguiente canción en la cola de "futuras" o avanza a la siguiente en la cola principal.
        
        Returns:
            Dict con información de la reproducción
            
        Raises:
            MusicManagerError: Si no hay canciones futuras o en cola
        """
        with self._lock:
            # Si hay canciones en la cola de "futuras", reproducir la siguiente
            if self._future_queue:
                if self._current_track:
                    self._history.append(self._current_track)
                next_track = self._future_queue.popleft()
                logger.info(f"Reproduciendo siguiente canción (de futuras): {next_track['title']}")
                self._backend.stop()
                await self._async_play_from_queue(next_track)
                return {
                    'status': 'playing_next_from_future',
                    'success': True,
                    'backend': self._backend_type
                }
            
            # Si no hay canciones futuras, intentar reproducir la siguiente de la cola principal
            elif self._queue:
                if self._current_track:
                    self._history.append(self._current_track)
                logger.info("Avanzando a la siguiente canción en la cola principal.")
                self._backend.stop() # Detener la actual para que _play_next_in_queue pueda tomar el control
                self._play_next_in_queue() # Esto ya maneja la reproducción
                
                # Devolver la información de la canción que se espera que se reproduzca
                # Esto es un poco tricky ya que _play_next_in_queue es asíncrono y en otro hilo
                # Podríamos necesitar un mecanismo para esperar el resultado o devolver un estado provisional
                return {
                    'status': 'advancing_queue',
                    'success': True,
                    'backend': self._backend_type
                }
            else:
                raise MusicManagerError("No hay canciones futuras ni en la cola principal.")

    def get_info(self) -> Dict[str, Any]:
        """
        Obtiene información completa del MusicManager.
        
        Returns:
            Dict con información completa
        """
        with self._lock:
            if not self._initialized:
                return {
                    'status': 'not_initialized',
                    'backend': None,
                    'current_track': None,
                    'volume': self._config['music'].get('default_volume', 65)
                }
            
            backend_info = self._backend.get_info()
            return {
                'status': 'initialized',
                'backend': backend_info,
                'current_track': self._current_track,
                'volume': self.get_volume(),
                'history': list(self._history),
                'queue': self.get_queue()
            }
    
    def cleanup(self):
        """Limpia recursos del MusicManager."""
        with self._lock:
            try:
                logger.info("Limpiando MusicManager")
                
                if self._backend:
                    self._backend.cleanup()
                    self._backend = None
                
                self._initialized = False
                self._current_track = None
                
                logger.info("MusicManager limpiado exitosamente")
                
            except Exception as e:
                logger.error(f"Error limpiando MusicManager: {e}")

    def __del__(self):
        """Destructor para limpiar recursos."""
        try:
            self.cleanup()
        except Exception:
            pass

    def get_config(self) -> Dict[str, Any]:
        with self._lock:
            return {
                'music': self._config.get('music', {}).copy(),
                'now_playing': self._current_track
            }

    def update_config(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            music_cfg = self._config.get('music', {})
            prev_playback = music_cfg.get('playback')
            if 'default_volume' in new_config:
                vol = int(max(0, min(100, new_config['default_volume'])))
                self._config['music']['default_volume'] = vol
                if self._backend:
                    self._backend.set_volume(vol)
            if 'retries' in new_config:
                self._config['music']['retries'] = int(new_config['retries'])
            if 'extractor' in new_config:
                self._config['music']['extractor'] = str(new_config['extractor'])
            if 'playback' in new_config:
                self._config['music']['playback'] = str(new_config['playback'])
            if 'playback' in new_config and new_config['playback'] != prev_playback:
                try:
                    if self._backend:
                        self._backend.cleanup()
                        self._backend = None
                    self._initialize_backend()
                except Exception as e:
                    logger.error(f"Error cambiando backend: {e}")
                    raise MusicManagerError(f"Error cambiando backend: {str(e)}")
            return {'music': self._config['music']}
