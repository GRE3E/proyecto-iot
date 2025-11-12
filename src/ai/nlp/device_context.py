import logging
import re
from typing import Optional, Dict
from datetime import datetime

logger = logging.getLogger("DeviceContext")

# Regex para ubicaciones de dispositivos
DEVICE_LOCATION_REGEX = re.compile(
    r"\b(salón|sala|cocina|dormitorio|pasillo|comedor|baño|garaje|lavandería|habitación|principal|invitados)\b",
    re.IGNORECASE
)

class UserDeviceContext:
    """Almacena el contexto de dispositivo del usuario para resolución de ambigüedades"""
    
    def __init__(self, context_ttl_seconds: int = 300):
        self.last_device = None
        self.last_location = None
        self.last_device_type = None
        self.timestamp = None
        self.context_ttl_seconds = context_ttl_seconds
    
    def update(self, device_name: str, location: str, device_type: str):
        """Actualiza el contexto con un nuevo dispositivo mencionado"""
        self.last_device = device_name
        self.last_location = location
        self.last_device_type = device_type
        self.timestamp = datetime.now()
        logger.debug(f"Contexto actualizado: dispositivo={device_name}, ubicación={location}")
    
    def is_expired(self) -> bool:
        """Verifica si el contexto expiró"""
        if not self.timestamp:
            return True
        return (datetime.now() - self.timestamp).total_seconds() > self.context_ttl_seconds
    
    def get_context_info(self) -> Optional[Dict[str, str]]:
        """Retorna la información del contexto si no está expirado"""
        if self.is_expired():
            self.last_device = None
            self.last_location = None
            self.last_device_type = None
            return None
        
        if self.last_device:
            return {
                "device": self.last_device,
                "location": self.last_location,
                "device_type": self.last_device_type
            }
        return None

class DeviceContextManager:
    """Gestiona contextos de dispositivo por usuario"""
    
    def __init__(self, iot_processor):
        self._user_device_context: Dict[int, UserDeviceContext] = {}
        self._iot_processor = iot_processor
    
    def get_or_create(self, user_id: int) -> UserDeviceContext:
        """Obtiene o crea el contexto de dispositivo del usuario"""
        if user_id not in self._user_device_context:
            self._user_device_context[user_id] = UserDeviceContext(context_ttl_seconds=300)
        return self._user_device_context[user_id]
    
    def update(self, user_id: int, prompt: str, extracted_command: Optional[str]):
        """Actualiza el contexto de dispositivo si se ejecutó un comando"""
        if not extracted_command or not user_id:
            return
        
        try:
            parts = extracted_command.split(":")
            if len(parts) >= 2:
                topic_payload = parts[1]
                topic = topic_payload.split(",")[0] if "," in topic_payload else topic_payload
                
                location = self._extract_device_location(prompt)
                device_type = self._extract_device_type(topic)
                
                context = self.get_or_create(user_id)
                device_name = topic.split("/")[-2] if "/" in topic else topic
                context.update(device_name, location or "desconocida", device_type)
                
                logger.info(f"Contexto de dispositivo actualizado para usuario {user_id}: {device_name} en {location}")
        except Exception as e:
            logger.warning(f"Error al actualizar contexto de dispositivo: {e}")
    
    def enhance_prompt(self, user_id: int, prompt: str) -> str:
        """Mejora el prompt con contexto de dispositivo anterior si aplica"""
        context = self.get_or_create(user_id)
        context_info = context.get_context_info()
        
        if not context_info:
            return prompt
        
        reference_words = ["la", "eso", "esa", "el", "esa misma", "lo mismo"]
        has_reference = any(word in prompt.lower() for word in reference_words)
        
        if has_reference and not self._extract_device_location(prompt):
            context_hint = f"[Contexto anterior: Fue sobre la {context_info['device_type']} en {context_info['location']}. Si el usuario dice 'la' o similar, probablemente se refiere a eso.]"
            enhanced_prompt = f"{prompt}\n{context_hint}"
            logger.debug(f"Prompt mejorado con contexto para usuario {user_id}")
            return enhanced_prompt
        
        return prompt
    
    @staticmethod
    def _extract_device_location(text: str) -> Optional[str]:
        """Extrae la ubicación del dispositivo del texto"""
        match = DEVICE_LOCATION_REGEX.search(text)
        if match:
            return match.group(1).lower()
        return None
    
    @staticmethod
    def _extract_device_type(topic: str) -> str:
        """Extrae tipo de dispositivo del topic MQTT"""
        device_type = "desconocido"
        if "light" in topic.lower():
            device_type = "luz"
        elif "door" in topic.lower():
            device_type = "puerta"
        elif "actuator" in topic.lower():
            device_type = "actuador"
        elif "climate" in topic.lower():
            device_type = "clima"
        return device_type
        