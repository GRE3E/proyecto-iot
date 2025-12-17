import logging
import asyncio
from typing import Dict, Any
from urllib.parse import urlparse

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

logger = logging.getLogger("YtDlpExtractor")


class ExtractorError(Exception):
    """Excepción personalizada para errores de extracción."""
    pass


class YtDlpExtractor:
    """Extractor de audio de YouTube usando yt-dlp."""
    
    def __init__(self, retries: int = 3, timeout: int = 30):
        """
        Inicializa el extractor.
        
        Args:
            retries: Número de reintentos en caso de fallo
            timeout: Tiempo de espera en segundos
        """
        self.retries = retries
        self.timeout = timeout
        self._ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'no_warnings': True,
            'extractaudio': True,
            'skip_download': True,
            'noplaylist': True,
            'socket_timeout': timeout,
        }
        
        if yt_dlp is None:
            logger.error("yt-dlp no está instalado. Por favor instala con: pip install yt-dlp")
            raise ImportError("yt-dlp es requerido para este extractor")
    
    def _is_valid_url(self, url: str) -> bool:
        """Verifica si una URL es válida."""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False
    
    def _search_youtube(self, query: str) -> str:
        """
        Busca en YouTube y retorna la URL del primer resultado.
        
        Args:
            query: Término de búsqueda
            
        Returns:
            URL del video de YouTube
            
        Raises:
            ExtractorError: Si no se encuentran resultados
        """
        search_query = f"ytsearch1:{query}"
        
        try:
            with yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True}) as ydl:
                info = ydl.extract_info(search_query, download=False)
                
                if not info or 'entries' not in info or not info['entries']:
                    raise ExtractorError(f"No se encontraron resultados para: {query}")
                
                first_entry = info['entries'][0]
                video_url = first_entry.get('webpage_url') or first_entry.get('url')
                
                if not video_url:
                    raise ExtractorError(f"No se pudo obtener URL del video: {query}")
                
                logger.info(f"Búsqueda exitosa: '{query}' -> {video_url}")
                return video_url
                
        except Exception as e:
            logger.error(f"Error en búsqueda de YouTube: {e}")
            raise ExtractorError(f"Error buscando '{query}': {str(e)}")
    
    def _extract_audio_url(self, video_url: str) -> Dict[str, Any]:
        """
        Extrae la URL de streaming de audio de un video de YouTube.
        
        Args:
            video_url: URL del video de YouTube
            
        Returns:
            Dict con 'url', 'title', 'duration', 'thumbnail'
            
        Raises:
            ExtractorError: Si no se puede extraer el audio
        """
        try:
            with yt_dlp.YoutubeDL(self._ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                
                if not info:
                    raise ExtractorError("No se pudo obtener información del video")
                
                # Buscar el mejor formato de audio
                formats = info.get('formats', [])
                audio_formats = [f for f in formats if f.get('vcodec') == 'none' and f.get('acodec') != 'none']
                
                if not audio_formats:
                    # Si no hay formatos de audio puros, buscar el mejor formato general
                    best_format = info.get('requested_formats', [info])[0] if 'requested_formats' in info else info
                else:
                    # Seleccionar el mejor formato de audio
                    best_format = max(audio_formats, key=lambda x: x.get('abr', 0) or x.get('tbr', 0))
                
                audio_url = best_format.get('url')
                if not audio_url:
                    raise ExtractorError("No se pudo obtener URL de audio")
                
                result = {
                    'url': audio_url,
                    'title': info.get('title', 'Título desconocido'),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'uploader': info.get('uploader', 'Desconocido'),
                    'format_note': best_format.get('format_note', ''),
                    'abr': best_format.get('abr', 0)
                }
                
                logger.info(f"Audio extraído exitosamente: {info.get('title', 'Título desconocido')}")
                return result
                
        except Exception as e:
            logger.error(f"Error extrayendo audio de {video_url}: {e}")
            raise ExtractorError(f"Error extrayendo audio: {str(e)}")
    
    async def extract_audio(self, query: str) -> Dict[str, Any]:
        """
        Extrae audio de YouTube dado un término de búsqueda o URL.
        
        Args:
            query: Término de búsqueda o URL de YouTube
            
        Returns:
            Dict con información del audio y URL de streaming
            
        Raises:
            ExtractorError: Si hay algún error en el proceso
        """
        logger.info(f"Extrayendo audio para: {query}")
        
        # Verificar si es una URL válida o un término de búsqueda
        if self._is_valid_url(query):
            video_url = query
        else:
            # Buscar en YouTube
            video_url = await asyncio.get_event_loop().run_in_executor(
                None, self._search_youtube, query
            )
        
        # Extraer información del audio con reintentos
        for attempt in range(self.retries):
            try:
                audio_info = await asyncio.get_event_loop().run_in_executor(
                    None, self._extract_audio_url, video_url
                )
                logger.info(f"Extracción exitosa en intento {attempt + 1}")
                return audio_info
                
            except Exception as e:
                logger.warning(f"Intento {attempt + 1} falló: {e}")
                if attempt == self.retries - 1:
                    raise ExtractorError(f"Fallaron todos los intentos después de {self.retries} reintentos: {str(e)}")
                
                # Esperar antes del siguiente intento
                await asyncio.sleep(1)
        
        raise ExtractorError("No se pudo extraer el audio después de todos los intentos")
    
    async def validate_url(self, url: str) -> bool:
        """
        Valida si una URL de YouTube es accesible.
        
        Args:
            url: URL a validar
            
        Returns:
            True si la URL es válida y accesible
        """
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, self._extract_audio_url, url
            )
            return True
        except Exception:
            return False