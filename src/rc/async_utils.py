"""
Async utilities for face recognition module.
Provides thread pool execution to prevent blocking the event loop.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, TypeVar, Any
from functools import wraps

logger = logging.getLogger("AsyncUtils")

T = TypeVar('T')

# Thread pool for CPU-intensive face recognition operations
_face_recognition_thread_pool = ThreadPoolExecutor(
    max_workers=4,
    thread_name_prefix="face_recognition"
)

# Thread pool for camera I/O operations
_camera_io_thread_pool = ThreadPoolExecutor(
    max_workers=2,
    thread_name_prefix="camera_io"
)


async def run_in_thread_pool(
    func: Callable[..., T],
    *args: Any,
    pool: ThreadPoolExecutor = None,
    **kwargs: Any
) -> T:
    """
    Run a blocking function in a thread pool to prevent event loop blocking.
    
    Args:
        func: The blocking function to execute
        *args: Positional arguments for the function
        pool: Optional specific thread pool to use
        **kwargs: Keyword arguments for the function
        
    Returns:
        The result of the function execution
        
    Raises:
        Any exception raised by the function
    """
    loop = asyncio.get_running_loop()
    executor = pool or _face_recognition_thread_pool
    
    try:
        return await loop.run_in_executor(executor, lambda: func(*args, **kwargs))
    except Exception as e:
        logger.error(f"Error executing {func.__name__} in thread pool: {e}")
        raise


async def run_camera_operation(func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """
    Run a camera I/O operation in the dedicated camera thread pool.
    
    Args:
        func: The camera operation function
        *args: Positional arguments
        **kwargs: Keyword arguments
        
    Returns:
        The result of the operation
    """
    return await run_in_thread_pool(func, *args, pool=_camera_io_thread_pool, **kwargs)


async def run_face_recognition_operation(func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """
    Run a face recognition operation in the dedicated face recognition thread pool.
    
    Args:
        func: The face recognition function
        *args: Positional arguments
        **kwargs: Keyword arguments
        
    Returns:
        The result of the operation
    """
    return await run_in_thread_pool(func, *args, pool=_face_recognition_thread_pool, **kwargs)


def async_to_thread(pool: ThreadPoolExecutor = None):
    """
    Decorator to automatically run a synchronous function in a thread pool.
    
    Usage:
        @async_to_thread()
        def blocking_function(arg1, arg2):
            # CPU-intensive or blocking I/O operation
            return result
            
        # Can now be awaited
        result = await blocking_function(val1, val2)
    
    Args:
        pool: Optional specific thread pool to use
        
    Returns:
        Decorator function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            return await run_in_thread_pool(func, *args, pool=pool, **kwargs)
        return wrapper
    return decorator


async def shutdown_thread_pools():
    """
    Shutdown all thread pools gracefully.
    Should be called during application shutdown.
    """
    logger.info("Shutting down face recognition thread pools...")
    
    _face_recognition_thread_pool.shutdown(wait=True)
    _camera_io_thread_pool.shutdown(wait=True)
    
    logger.info("Thread pools shut down successfully")


# Convenience decorators for specific operations
camera_operation = async_to_thread(pool=_camera_io_thread_pool)
face_recognition_operation = async_to_thread(pool=_face_recognition_thread_pool)
