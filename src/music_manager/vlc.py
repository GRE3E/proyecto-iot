import logging
import time
import threading
from typing import Dict, Any
from enum import Enum

try:
    import vlc
except ImportError:
    vlc = None

logger = logging.getLogger("VlcPlayer")


class PlaybackState(Enum):
    """Estados posibles del reproductor."""
    IDLE = "idle"
    PLAYING = "playing"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"


class PlaybackError(Exception):
    """Excepción personalizada para errores de reproducción."""
    pass


class VlcBackend:
    """Backend de reproducción usando python-vlc."""
    
    def __init__(self, volume: int = 65, song_ended_callback=None):
        """
        Inicializa el backend VLC.
        
        Args:
            volume: Volumen inicial (0-100)
        """
        self._instance = None
        self._player = None
        self._media = None
        self._state = PlaybackState.IDLE
        self._current_url = None
        self._volume = max(0, min(100, volume))
        self._lock = threading.RLock()
        self._position_update_thread = None
        self._stop_position_thread = threading.Event()
        self._song_ended_callback = song_ended_callback
        
        if vlc is None:
            logger.error("python-vlc no está instalado. Por favor instala con: pip install python-vlc")
            raise ImportError("python-vlc es requerido para este backend")
        
        self._initialize_vlc()
    
    def _initialize_vlc(self):
        """Inicializa la instancia de VLC."""
        try:
            # Crear instancia de VLC
            self._instance = vlc.Instance('--no-video', '--quiet')
            if not self._instance:
                raise PlaybackError("No se pudo crear instancia de VLC")
            
            # Crear reproductor
            self._player = self._instance.media_player_new()
            if not self._player:
                raise PlaybackError("No se pudo crear reproductor VLC")
            try:
                em = self._player.event_manager()
                em.event_attach(vlc.EventType.MediaPlayerEndReached, self._on_media_end)
            except Exception:
                pass
            
            # Configurar volumen inicial
            self.set_volume(self._volume)
            
            logger.info("VLC backend inicializado exitosamente")
            
        except Exception as e:
            logger.error(f"Error inicializando VLC: {e}")
            raise PlaybackError(f"Error inicializando VLC: {str(e)}")
    
    def _start_position_monitor(self):
        """Inicia el monitoreo de posición para detectar fin de reproducción."""
        def monitor_position():
            while not self._stop_position_thread.is_set():
                try:
                    with self._lock:
                        if (self._state == PlaybackState.PLAYING and 
                            self._player and 
                            self._player.get_state() == vlc.State.Ended):
                            logger.info("Reproducción finalizada naturalmente")
                            self._state = PlaybackState.STOPPED
                            self._current_url = None
                            if self._song_ended_callback:
                                self._song_ended_callback()
                            break
                    
                    time.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Error en monitoreo de posición: {e}")
                    break
        
        self._stop_position_thread.clear()
        self._position_update_thread = threading.Thread(target=monitor_position, daemon=True)
        self._position_update_thread.start()

    def _on_media_end(self, event):
        try:
            with self._lock:
                self._stop_position_monitor()
                self._state = PlaybackState.STOPPED
                self._current_url = None
            if self._song_ended_callback:
                self._song_ended_callback()
        except Exception:
            pass
    
    def _stop_position_monitor(self):
        """Detiene el monitoreo de posición."""
        self._stop_position_thread.set()
        if self._position_update_thread and self._position_update_thread.is_alive():
            self._position_update_thread.join(timeout=1)
    
    def play(self, url: str) -> bool:
        """
        Reproduce audio desde una URL.
        
        Args:
            url: URL del stream de audio
            
        Returns:
            True si la reproducción inició exitosamente
            
        Raises:
            PlaybackError: Si hay un error en la reproducción
        """
        with self._lock:
            try:
                logger.info(f"Iniciando reproducción: {url}")
                
                # Detener reproducción actual si existe
                if self._state != PlaybackState.IDLE:
                    self.stop()
                
                # Crear media desde URL
                self._media = self._instance.media_new(url)
                if not self._media:
                    raise PlaybackError("No se pudo crear media desde URL")
                
                # Configurar media en el reproductor
                self._player.set_media(self._media)
                
                # Iniciar reproducción
                result = self._player.play()
                if result is not None and result != 0:
                    raise PlaybackError("Error al iniciar reproducción")
                
                # Esperar un momento para que comience la reproducción
                time.sleep(0.1)
                
                # Verificar que esté reproduciendo
                if self._player.get_state() in [vlc.State.Error, vlc.State.Ended]:
                    raise PlaybackError("Error en el stream de audio")
                
                # Actualizar estado
                self._state = PlaybackState.PLAYING
                self._current_url = url
                
                # Iniciar monitoreo de posición
                self._start_position_monitor()
                
                logger.info("Reproducción iniciada exitosamente")
                return True
                
            except Exception as e:
                logger.error(f"Error en reproducción: {e}")
                self._state = PlaybackState.ERROR
                self._current_url = None
                raise PlaybackError(f"Error reproduciendo audio: {str(e)}")
    
    def pause(self) -> bool:
        """
        Pausa la reproducción actual.
        
        Returns:
            True si se pausó exitosamente
        """
        with self._lock:
            try:
                if self._state != PlaybackState.PLAYING:
                    logger.warning("No hay reproducción activa para pausar")
                    return False
                
                if not self._player:
                    raise PlaybackError("Reproductor no inicializado")
                
                logger.debug(f"Estado de VLC antes de pausar: {self._player.get_state()}")
                result = self._player.pause()
                logger.debug(f"Resultado de self._player.pause(): {result}")
                if result is not None and result != 0:
                    raise PlaybackError("Error al pausar")
                
                self._state = PlaybackState.PAUSED
                logger.info("Reproducción pausada")
                return True
                
            except Exception as e:
                logger.error(f"Error pausando: {e}")
                raise PlaybackError(f"Error pausando: {str(e)}")
    
    def resume(self) -> bool:
        """
        Reanuda la reproducción pausada.
        
        Returns:
            True si se reanudó exitosamente
        """
        with self._lock:
            try:
                if self._state != PlaybackState.PAUSED:
                    logger.warning("No hay reproducción pausada para reanudar")
                    return False
                
                if not self._player:
                    raise PlaybackError("Reproductor no inicializado")
                
                result = self._player.play()
                if result != 0:
                    raise PlaybackError("Error al reanudar")
                
                self._state = PlaybackState.PLAYING
                logger.info("Reproducción reanudada")
                return True
                
            except Exception as e:
                logger.error(f"Error reanudando: {e}")
                raise PlaybackError(f"Error reanudando: {str(e)}")
    
    def stop(self) -> bool:
        """
        Detiene la reproducción actual.
        
        Returns:
            True si se detuvo exitosamente
        """
        with self._lock:
            try:
                if self._state in [PlaybackState.IDLE, PlaybackState.STOPPED]:
                    logger.warning("No hay reproducción activa para detener")
                    return False
                
                if not self._player:
                    raise PlaybackError("Reproductor no inicializado")
                
                # Detener monitoreo
                self._stop_position_monitor()
                
                # Detener reproducción
                result = self._player.stop()
                if result != 0:
                    logger.warning("Error al detener (continuando de todos modos)")
                
                # Limpiar media
                if self._media:
                    self._media.release()
                    self._media = None
                
                # Actualizar estado
                self._state = PlaybackState.STOPPED
                self._current_url = None
                
                logger.info("Reproducción detenida")
                return True
                
            except Exception as e:
                logger.error(f"Error deteniendo: {e}")
                self._state = PlaybackState.ERROR
                raise PlaybackError(f"Error deteniendo: {str(e)}")
    
    def set_volume(self, volume: int) -> bool:
        """
        Establece el volumen.
        
        Args:
            volume: Volumen (0-100)
            
        Returns:
            True si se estableció exitosamente
        """
        with self._lock:
            try:
                volume = max(0, min(100, volume))
                self._volume = volume
                
                if self._player:
                    # VLC usa volumen 0-100, pero 100 es el volumen máximo
                    vlc_volume = int(volume)
                    result = self._player.audio_set_volume(vlc_volume)
                    if result != 0:
                        raise PlaybackError("Error al establecer volumen")
                
                logger.info(f"Volumen establecido a {volume}%")
                return True
                
            except Exception as e:
                logger.error(f"Error estableciendo volumen: {e}")
                raise PlaybackError(f"Error estableciendo volumen: {str(e)}")
    
    def get_volume(self) -> int:
        """
        Obtiene el volumen actual.
        
        Returns:
            Volumen actual (0-100)
        """
        with self._lock:
            return self._volume
    
    def is_playing(self) -> bool:
        """
        Verifica si está reproduciendo.
        
        Returns:
            True si está reproduciendo
        """
        with self._lock:
            return self._state == PlaybackState.PLAYING
    
    def is_paused(self) -> bool:
        """
        Verifica si está pausado.
        
        Returns:
            True si está pausado
        """
        with self._lock:
            return self._state == PlaybackState.PAUSED
    
    def get_state(self) -> PlaybackState:
        """
        Obtiene el estado actual del reproductor.
        
        Returns:
            Estado actual
        """
        with self._lock:
            return self._state
    
    def get_position(self) -> float:
        """
        Obtiene la posición actual de reproducción.
        
        Returns:
            Posición en segundos
        """
        with self._lock:
            try:
                if self._player and self._state in [PlaybackState.PLAYING, PlaybackState.PAUSED]:
                    return self._player.get_time() / 1000.0  # Convertir a segundos
                return 0.0
            except Exception:
                return 0.0
    
    def get_duration(self) -> float:
        """
        Obtiene la duración total del audio.
        
        Returns:
            Duración en segundos
        """
        with self._lock:
            try:
                if self._player and self._state in [PlaybackState.PLAYING, PlaybackState.PAUSED]:
                    return self._player.get_length() / 1000.0  # Convertir a segundos
                return 0.0
            except Exception:
                return 0.0
    
    def get_info(self) -> Dict[str, Any]:
        """
        Obtiene información del reproductor.
        
        Returns:
            Dict con información del reproductor
        """
        with self._lock:
            return {
                'state': self._state.value,
                'current_url': self._current_url,
                'volume': self._volume,
                'position': self.get_position(),
                'duration': self.get_duration(),
                'backend': 'vlc'
            }

    def seek(self, seconds: float) -> bool:
        """
        Salta a una posición específica en segundos.
        """
        with self._lock:
            try:
                if not self._player:
                    raise PlaybackError("Reproductor no inicializado")
                ms = int(max(0, seconds) * 1000)
                result = self._player.set_time(ms)
                if result is None or result == 0:
                    return True
                # Fallback 1: usar set_position si set_time reporta error
                length = self._player.get_length()
                if length and length > 0:
                    pos = max(0.0, min(1.0, ms / float(length)))
                    self._player.set_position(pos)
                    return True
                # Fallback 2: si está PAUSADO, reproducir brevemente, hacer seek y pausar
                try:
                    if self._state == PlaybackState.PAUSED:
                        self._player.play()
                        time.sleep(0.05)
                        self._player.set_time(ms)
                        self._player.pause()
                        return True
                except Exception:
                    pass
                # Si no logramos cambiar, no generar excepción dura
                return False
            except Exception as e:
                logger.error(f"Error en seek VLC: {e}")
                return False
    
    def cleanup(self):
        """Limpia recursos del reproductor."""
        with self._lock:
            try:
                self._stop_position_monitor()
                
                if self._player:
                    self._player.stop()
                    self._player.release()
                    self._player = None
                
                if self._media:
                    self._media.release()
                    self._media = None
                
                if self._instance:
                    self._instance.release()
                    self._instance = None
                
                self._state = PlaybackState.IDLE
                self._current_url = None
                
                logger.info("VLC backend limpiado exitosamente")
                
            except Exception as e:
                logger.error(f"Error limpiando VLC backend: {e}")
    
    def __del__(self):
        """Destructor para limpiar recursos."""
        try:
            self.cleanup()
        except Exception:
            pass
