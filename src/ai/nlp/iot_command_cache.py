import logging
import time
from typing import Dict, List, Tuple, Any, Optional
from functools import lru_cache

logger = logging.getLogger("IoTCommandCache")

class IoTCommandCache:
    """Clase para implementar caché de comandos IoT."""
    
    def __init__(self, ttl_seconds: int = 300):
        """Inicializa el caché de comandos IoT.
        
        Args:
            ttl_seconds: Tiempo de vida de los elementos en caché en segundos.
        """
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._ttl_seconds = ttl_seconds
        logger.info(f"Caché de comandos IoT inicializado con TTL de {ttl_seconds} segundos")
    
    def get(self, key: str) -> Optional[Any]:
        """Obtiene un valor del caché si existe y no ha expirado.
        
        Args:
            key: Clave para buscar en el caché.
            
        Returns:
            El valor almacenado o None si no existe o ha expirado.
        """
        if key not in self._cache:
            return None
            
        value, timestamp = self._cache[key]
        if time.time() - timestamp > self._ttl_seconds:
            del self._cache[key]
            return None
            
        logger.debug(f"Caché hit para clave '{key}'")
        return value
    
    def set(self, key: str, value: Any) -> None:
        """Almacena un valor en el caché.
        
        Args:
            key: Clave para almacenar el valor.
            value: Valor a almacenar.
        """
        self._cache[key] = (value, time.time())
        logger.debug(f"Valor almacenado en caché para clave '{key}'")
    
    def invalidate(self, key: str) -> None:
        """Invalida una entrada específica del caché.
        
        Args:
            key: Clave a invalidar.
        """
        if key in self._cache:
            del self._cache[key]
            logger.debug(f"Caché invalidado para clave '{key}'")
    
    def clear(self) -> None:
        """Limpia todo el caché."""
        self._cache.clear()
        logger.info("Caché de comandos IoT limpiado completamente")
    
    def cleanup_expired(self) -> int:
        """Elimina todas las entradas expiradas del caché.
        
        Returns:
            Número de entradas eliminadas.
        """
        now = time.time()
        expired_keys = [
            key for key, (_, timestamp) in self._cache.items() 
            if now - timestamp > self._ttl_seconds
        ]
        
        for key in expired_keys:
            del self._cache[key]
            
        if expired_keys:
            logger.debug(f"Se eliminaron {len(expired_keys)} entradas expiradas del caché")
            
        return len(expired_keys)