import logging
import threading
from typing import Optional, Dict, Any, Union
from pathlib import Path
import asyncio

try:
    import yaml
except ImportError:
    yaml = None

from .yt_dlp_extractor import YtDlpExtractor, ExtractorError
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
        self._lock = threading.RLock()
        self._initialized = False
        
        # Inicializar componentes
        self._initialize()
    
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
                self._backend = VlcBackend(volume=volume)
                self._backend_type = 'vlc'
                logger.info("Backend VLC inicializado")
                return
            except ImportError as e:
                logger.warning(f"VLC no disponible: {e}, intentando mpv")
            except Exception as e:
                logger.warning(f"Error inicializando VLC: {e}, intentando mpv")
        
        # Intentar mpv como fallback
        try:
            self._backend = MpvBackend(volume=volume)
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
                
                # Detener reproducción actual si existe
                if self.get_state() != "idle":
                    self.stop()
                
                # Extraer información del audio
                logger.info("Extrayendo información del audio...")
                audio_info = await self._extractor.extract_audio(query)
                
                # Reproducir el audio sin bloquear el event loop
                logger.info(f"Reproduciendo: {audio_info['title']}")
                loop = asyncio.get_event_loop()
                success = await loop.run_in_executor(
                    None, self._backend.play, audio_info['url']
                )
                
                if not success:
                    raise MusicManagerError("No se pudo iniciar la reproducción")
                
                # Guardar información de la pista actual
                self._current_track = audio_info
                
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
                
                # Limpiar pista actual
                if success:
                    self._current_track = None
                
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
                'volume': self.get_volume()
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
