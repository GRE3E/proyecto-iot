import logging
from typing import Dict, Any, Optional, Callable, Type
from functools import wraps
import traceback
import asyncio

logger = logging.getLogger("ErrorHandler")

class ErrorHandler:
    """Clase para unificar el manejo de errores en el sistema."""
    
    @staticmethod
    def format_error(error: Exception, context: str = "") -> Dict[str, Any]:
        """Formatea un error para devolverlo como respuesta."""
        error_type = type(error).__name__
        error_message = str(error)
        error_traceback = traceback.format_exc()
        
        logger.error(f"Error en {context}: {error_type} - {error_message}")
        logger.debug(f"Traceback: {error_traceback}")
        
        return {
            "error": error_message,
            "error_type": error_type,
            "context": context,
            "success": False
        }
    
    @staticmethod
    def handle_exceptions(func):
        """Decorador para manejar excepciones en funciones sincrónicas."""
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                context = f"{func.__module__}.{func.__name__}"
                return ErrorHandler.format_error(e, context)
        return wrapper
    
    @staticmethod
    def handle_async_exceptions(func):
        """Decorador para manejar excepciones en funciones asincrónicas."""
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                context = f"{func.__module__}.{func.__name__}"
                return ErrorHandler.format_error(e, context)
        return wrapper
    
    @staticmethod
    def safe_execute(func: Callable, *args, default_return: Any = None, context: str = "", **kwargs) -> Any:
        """Ejecuta una función de manera segura, capturando excepciones."""
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error en {context}: {e}")
            return default_return
    
    @staticmethod
    async def safe_execute_async(func: Callable, *args, default_return: Any = None, context: str = "", **kwargs) -> Any:
        """Ejecuta una función de manera segura, capturando excepciones.
        Si la función es asíncrona, la ejecuta con await, si no, la ejecuta en un thread separado."""
        try:
            result = func(*args, **kwargs)
            if asyncio.iscoroutine(result):
                return await result
            return result
        except Exception as e:
            logger.error(f"Error en {context}: {e}")
            return default_return