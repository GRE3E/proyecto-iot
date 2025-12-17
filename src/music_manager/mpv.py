import logging
import subprocess
import threading
import time
from typing import Dict, Any
from enum import Enum

logger = logging.getLogger("MpvPlayer")

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


class MpvBackend:
    """Backend de reproducción usando mpv como proceso externo."""
    
    def __init__(self, volume: int = 65, song_ended_callback=None):
        """
        Inicializa el backend mpv.
        
        Args:
            volume: Volumen inicial (0-100)
        """
        self._process = None
        self._state = PlaybackState.IDLE
        self._current_url = None
        self._volume = max(0, min(100, volume))
        self._lock = threading.RLock()
        self._monitor_thread = None
        self._stop_monitor = threading.Event()
        self._ipc_socket = None
        self._song_ended_callback = song_ended_callback
        
        # Verificar que mpv esté disponible
        self._check_mpv_availability()
    
    def _check_mpv_availability(self):
        """Verifica que mpv esté disponible en el sistema."""
        try:
            result = subprocess.run(
                ['mpv', '--version'], 
                capture_output=True, 
                text=True, 
                timeout=5
            )
            if result.returncode != 0:
                raise PlaybackError("mpv no está disponible o no funciona correctamente")
            
            logger.info("mpv está disponible en el sistema")
            
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.error(f"mpv no está disponible: {e}")
            raise PlaybackError("mpv no está instalado o no está en el PATH")
    
    def _start_process_monitor(self):
        """Inicia el monitoreo del proceso mpv."""
        def monitor_process():
            while not self._stop_monitor.is_set():
                try:
                    if self._process and self._process.poll() is not None:
                        # El proceso terminó
                        with self._lock:
                            if self._state == PlaybackState.PLAYING:
                                logger.info("mpv terminó naturalmente")
                                self._state = PlaybackState.STOPPED
                                self._current_url = None
                                if self._song_ended_callback:
                                    try:
                                        self._song_ended_callback()
                                    except Exception as cb_err:
                                        logger.error(f"Error en callback de fin: {cb_err}")
                        break
                    
                    time.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Error en monitoreo de proceso: {e}")
                    break
        
        self._stop_monitor.clear()
        self._monitor_thread = threading.Thread(target=monitor_process, daemon=True)
        self._monitor_thread.start()
    
    def _stop_process_monitor(self):
        """Detiene el monitoreo del proceso."""
        self._stop_monitor.set()
        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=1)
    
    def _send_mpv_command(self, command: str) -> bool:
        """
        Envía un comando a mpv a través de stdin.
        
        Args:
            command: Comando a enviar
            
        Returns:
            True si el comando fue enviado exitosamente
        """
        try:
            if not self._process or self._process.poll() is not None:
                return False
            
            # Enviar comando con terminador de línea
            self._process.stdin.write(f"{command}\n")
            self._process.stdin.flush()
            return True
            
        except Exception as e:
            logger.error(f"Error enviando comando a mpv: {e}")
            return False
    
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
                logger.info(f"Iniciando reproducción con mpv: {url}")
                
                # Detener reproducción actual si existe
                if self._state != PlaybackState.IDLE:
                    self.stop()
                
                # Argumentos para mpv
                mpv_args = [
                    'mpv',
                    url,
                    '--no-video',
                    '--volume=' + str(self._volume),
                    '--really-quiet',
                    '--no-terminal',
                    '--input-terminal=no',
                    '--terminal=no'
                ]
                
                # Iniciar proceso mpv
                self._process = subprocess.Popen(
                    mpv_args,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1
                )
                
                # Verificar que el proceso inició correctamente
                if self._process.poll() is not None:
                    stdout, stderr = self._process.communicate()
                    raise PlaybackError(f"mpv falló al iniciar: {stderr}")
                
                # Esperar un momento para que comience la reproducción
                time.sleep(0.5)
                
                # Verificar que el proceso siga activo
                if self._process.poll() is not None:
                    stdout, stderr = self._process.communicate()
                    raise PlaybackError(f"mpv terminó inesperadamente: {stderr}")
                
                # Actualizar estado
                self._state = PlaybackState.PLAYING
                self._current_url = url
                
                # Iniciar monitoreo de proceso
                self._start_process_monitor()
                
                logger.info("Reproducción iniciada exitosamente con mpv")
                return True
                
            except Exception as e:
                logger.error(f"Error en reproducción mpv: {e}")
                self._state = PlaybackState.ERROR
                self._current_url = None
                self._cleanup_process()
                raise PlaybackError(f"Error reproduciendo audio con mpv: {str(e)}")
    
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
                
                if not self._process or self._process.poll() is not None:
                    raise PlaybackError("Proceso mpv no está activo")
                
                # Enviar comando de pausa
                if self._send_mpv_command('pause'):
                    self._state = PlaybackState.PAUSED
                    logger.info("Reproducción pausada con mpv")
                    return True
                else:
                    raise PlaybackError("No se pudo enviar comando de pausa")
                    
            except Exception as e:
                logger.error(f"Error pausando mpv: {e}")
                raise PlaybackError(f"Error pausando mpv: {str(e)}")
    
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
                
                if not self._process or self._process.poll() is not None:
                    raise PlaybackError("Proceso mpv no está activo")
                
                # Enviar comando de reanudar (pause nuevamente alterna el estado)
                if self._send_mpv_command('pause'):
                    self._state = PlaybackState.PLAYING
                    logger.info("Reproducción reanudada con mpv")
                    return True
                else:
                    raise PlaybackError("No se pudo enviar comando de reanudar")
                    
            except Exception as e:
                logger.error(f"Error reanudando mpv: {e}")
                raise PlaybackError(f"Error reanudando mpv: {str(e)}")
    
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
                
                # Detener monitoreo
                self._stop_process_monitor()
                
                # Terminar proceso
                if self._process and self._process.poll() is None:
                    try:
                        self._process.terminate()
                        self._process.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        logger.warning("mpv no respondió a terminate, forzando kill")
                        self._process.kill()
                        self._process.wait(timeout=1)
                
                # Limpiar
                self._cleanup_process()
                
                # Actualizar estado
                self._state = PlaybackState.STOPPED
                self._current_url = None
                
                logger.info("Reproducción detenida con mpv")
                return True
                
            except Exception as e:
                logger.error(f"Error deteniendo mpv: {e}")
                self._state = PlaybackState.ERROR
                raise PlaybackError(f"Error deteniendo mpv: {str(e)}")
    
    def _cleanup_process(self):
        """Limpia el proceso y pipes."""
        try:
            if self._process:
                if self._process.stdin:
                    self._process.stdin.close()
                if self._process.stdout:
                    self._process.stdout.close()
                if self._process.stderr:
                    self._process.stderr.close()
                self._process = None
        except Exception as e:
            logger.error(f"Error limpiando proceso: {e}")
    
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
                
                if self._process and self._process.poll() is None:
                    # Enviar comando de volumen
                    volume_command = f'volume {volume} 1'
                    if not self._send_mpv_command(volume_command):
                        logger.warning("No se pudo enviar comando de volumen")
                
                logger.info(f"Volumen establecido a {volume}% en mpv")
                return True
                
            except Exception as e:
                logger.error(f"Error estableciendo volumen mpv: {e}")
                raise PlaybackError(f"Error estableciendo volumen mpv: {str(e)}")
    
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
            Posición en segundos (aproximada)
        """
        # mpv no proporciona una forma fácil de obtener posición sin IPC
        # Retornamos 0 ya que no podemos obtener la posición exacta
        return 0.0
    
    def get_duration(self) -> float:
        """
        Obtiene la duración total del audio.
        
        Returns:
            Duración en segundos (aproximada)
        """
        # mpv no proporciona una forma fácil de obtener duración sin IPC
        # Retornamos 0 ya que no podemos obtener la duración exacta
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
                'backend': 'mpv'
            }

    def seek(self, seconds: float) -> bool:
        """
        Intenta saltar a una posición específica usando el comando de mpv.
        """
        with self._lock:
            try:
                if not self._process or self._process.poll() is not None:
                    raise PlaybackError("Proceso mpv no está activo")
                cmd = f'seek {max(0, float(seconds))} absolute'
                return self._send_mpv_command(cmd)
            except Exception as e:
                logger.error(f"Error en seek mpv: {e}")
                return False
    
    def cleanup(self):
        """Limpia recursos del reproductor."""
        with self._lock:
            try:
                self._stop_process_monitor()
                
                if self._process:
                    try:
                        if self._process.poll() is None:
                            self._process.terminate()
                            self._process.wait(timeout=1)
                    except Exception:
                        self._process.kill()
                    finally:
                        self._cleanup_process()
                
                self._state = PlaybackState.IDLE
                self._current_url = None
                
                logger.info("mpv backend limpiado exitosamente")
                
            except Exception as e:
                logger.error(f"Error limpiando mpv backend: {e}")
    
    def __del__(self):
        """Destructor para limpiar recursos."""
        try:
            self.cleanup()
        except Exception:
            pass