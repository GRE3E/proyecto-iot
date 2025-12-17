"""
Custom exceptions for face recognition module.
Provides clear, specific error types for better error handling.
"""


class FaceRecognitionError(Exception):
    """Base exception for all face recognition errors."""
    pass


class CameraAccessError(FaceRecognitionError):
    """Raised when camera cannot be accessed or initialized."""
    
    def __init__(self, camera_id: int = 0, message: str = None):
        self.camera_id = camera_id
        if message is None:
            message = f"No se pudo acceder a la cámara {camera_id}. Verifique que esté conectada y no esté en uso."
        super().__init__(message)


class FaceNotDetectedError(FaceRecognitionError):
    """Raised when no face is detected in the provided image."""
    
    def __init__(self, source: str = "imagen"):
        message = f"No se detectó ningún rostro en {source}. Asegúrese de que haya buena iluminación y el rostro esté visible."
        super().__init__(message)


class LowQualityImageError(FaceRecognitionError):
    """Raised when image quality is too low for reliable recognition."""
    
    def __init__(self, quality_score: float, threshold: float):
        message = f"Calidad de imagen insuficiente ({quality_score:.2f} < {threshold:.2f}). Mejore la iluminación o use una cámara de mejor calidad."
        super().__init__(message)


class EncodingGenerationError(FaceRecognitionError):
    """Raised when face encoding cannot be generated."""
    
    def __init__(self, user_name: str = None, reason: str = None):
        if user_name:
            message = f"No se pudo generar encoding facial para {user_name}"
        else:
            message = "No se pudo generar encoding facial"
        
        if reason:
            message += f": {reason}"
        
        super().__init__(message)


class UserNotFoundError(FaceRecognitionError):
    """Raised when a user is not found in the database."""
    
    def __init__(self, identifier: str):
        message = f"Usuario '{identifier}' no encontrado en el sistema."
        super().__init__(message)


class UserAlreadyExistsError(FaceRecognitionError):
    """Raised when attempting to register a user that already exists."""
    
    def __init__(self, user_name: str):
        message = f"El usuario '{user_name}' ya está registrado en el sistema."
        super().__init__(message)


class InsufficientPhotosError(FaceRecognitionError):
    """Raised when not enough photos were captured for registration."""
    
    def __init__(self, captured: int, required: int):
        message = f"Solo se capturaron {captured} de {required} fotos requeridas. Intente nuevamente con mejor iluminación."
        super().__init__(message)
