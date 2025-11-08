import asyncio
import logging
import re
import httpx
import src.db.models as models
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.db.models import IoTCommand
from src.iot.mqtt_client import MQTTClient
from src.ai.nlp.iot_command_cache import IoTCommandCache

logger = logging.getLogger("IoTCommandProcessor")

class IoTCommandProcessor:
    def __init__(self, mqtt_client: MQTTClient):
        self._mqtt_client = mqtt_client
        self._command_cache = IoTCommandCache(ttl_seconds=60)
        self._cleanup_task = None
        self._last_parsed_command = None
        
    async def initialize(self, db: AsyncSession):
        """Inicializa el procesador de comandos IoT, pre-cargando la caché.
        
        Args:
            db: Sesión de base de datos.
        """
        logger.info("Pre-cargando caché de comandos IoT...")
        try:
            result = await db.execute(select(models.IoTCommand))
            iot_commands_db = result.scalars().all()
            self.iot_commands = []
            
            for cmd in iot_commands_db:
                command_str = f"mqtt_publish:{cmd.mqtt_topic},{cmd.command_payload}"
                is_valid, _, parsed_command = self._parse_iot_command(command_str)
                if is_valid and parsed_command["command_name"] == "mqtt_publish":
                    self.iot_commands.append(command_str)
            
            for cmd in iot_commands_db:
                cache_key = f"iot_command:{cmd.name}"
                self._command_cache.set(cache_key, cmd)
            
            logger.info(f"Caché pre-cargado con {len(iot_commands_db)} comandos IoT")
        except Exception as e:
            logger.error(f"Error al pre-cargar caché de comandos IoT: {e}")
            
        self._start_cleanup_task()
        
    def _start_cleanup_task(self):
        """Inicia una tarea periódica para limpiar entradas expiradas del caché."""
        async def cleanup_loop():
            while True:
                try:
                    removed = self._command_cache.cleanup_expired()
                    if removed > 0:
                        logger.debug(f"Limpieza automática: {removed} entradas expiradas eliminadas del caché")
                    await asyncio.sleep(60)
                except asyncio.CancelledError:
                    logger.info("Tarea de limpieza de caché cancelada")
                    break
                except Exception as e:
                    logger.error(f"Error en tarea de limpieza de caché: {e}")
                    await asyncio.sleep(60)
                    
        if self._cleanup_task is not None:
            self._cleanup_task.cancel()
            
        self._cleanup_task = asyncio.create_task(cleanup_loop())
        logger.info("Tarea de limpieza automática de caché iniciada")
        
    def invalidate_command_cache(self, command_name: Optional[str] = None):
        """Invalida la caché de comandos IoT.
        
        Args:
            command_name: Nombre del comando a invalidar. Si es None, se invalida toda la caché.
        """
        if command_name:
            cache_key = f"iot_command:{command_name}"
            self._command_cache.invalidate(cache_key)
            logger.debug(f"Caché invalidado para comando '{command_name}'")
        else:
            self._command_cache.clear()
            logger.debug("Caché de comandos IoT completamente invalidado")

    def _parse_iot_command(self, command_str: str) -> Tuple[bool, str, Optional[dict]]:
        """
        Parsea un comando IoT y devuelve sus componentes.
        
        Args:
            command_str: String con el comando completo (mqtt_publish:topic,payload)
            
        Returns:
            tuple: (éxito, mensaje_error, {command_name, topic, payload} o None si hay error)
        """
        result = {"command_name": None, "topic": None, "payload": None}
        
        if command_str.startswith("mqtt_publish:"):
            mqtt_parts = command_str[len("mqtt_publish:"):].split(',', 1)
            if len(mqtt_parts) < 2:
                return False, "Formato de comando MQTT inválido. Se esperaba 'mqtt_publish:topic,payload'.", None
            
            result["command_name"] = "mqtt_publish"
            result["topic"] = mqtt_parts[0].strip()
            result["payload"] = mqtt_parts[1].strip()
        else:
            return False, "Formato de comando IoT no reconocido. Solo se acepta 'mqtt_publish:topic,payload'.", None
        
        if not result["topic"] or not result["payload"]:
            return False, f"El tópico y el payload no pueden estar vacíos para el comando '{result['command_name']}'.", None
            
        return True, "", result

    async def process_iot_command(
        self, db: AsyncSession, full_response_content: str, token: str
    ) -> Optional[str]:
        """Procesa y ejecuta un comando IoT extraído de la respuesta del LLM"""
        iot_command_match = re.search(r"mqtt_publish:(.+)", full_response_content)
        if iot_command_match:
            full_command_with_args = "mqtt_publish:" + iot_command_match.group(1).strip()
            
            success, error_msg, command_parts = self._parse_iot_command(full_command_with_args)
            if not success:
                logger.error(f"Error al parsear comando IoT: {error_msg}")
                return f"Error: {error_msg}"
            
            topic = command_parts["topic"]
            payload = command_parts["payload"]
            
            logger.info(f"Comando IoT: topic='{topic}', payload='{payload}'")
            
            try:
                result = await db.execute(
                    select(IoTCommand).filter(
                        IoTCommand.mqtt_topic == topic,
                        IoTCommand.command_payload == payload
                    )
                )
                db_command = result.scalars().first()
            except Exception as e:
                logger.error(f"Error al buscar comando en BD: {e}")
                return f"Error al buscar comando: {str(e)}"
            
            if not db_command:
                logger.warning(f"Comando no encontrado en BD: topic='{topic}', payload='{payload}'")
                return "Lo siento, el comando solicitado no existe en el sistema."
            
            logger.debug(f"Comando encontrado: {db_command.name} (tipo: {db_command.command_type})")
            
            if db_command.command_type != "mqtt":
                logger.warning(f"Tipo de comando no soportado: {db_command.command_type}")
                return "Tipo de comando no soportado."
            
            try:
                arduino_command = {
                    "mqtt_topic": db_command.mqtt_topic,
                    "command_payload": db_command.command_payload
                }
                headers = {"Authorization": f"Bearer {token}"}
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "http://localhost:8000/iot/arduino/send_command",
                        json=arduino_command,
                        headers=headers,
                        timeout=10
                    )
                    response.raise_for_status()
                    
                    logger.info(f"Comando ejecutado: {db_command.name}")
                    return f"✓ {db_command.name}"

            except httpx.TimeoutException:
                logger.error("Timeout al enviar comando a Arduino")
                return "Error: Timeout al enviar comando a Arduino."
            except httpx.HTTPStatusError as e:
                logger.error(f"Error HTTP: {e.response.status_code}")
                return "Error: No se pudo ejecutar el comando."
            except Exception as e:
                logger.error(f"Error al ejecutar comando: {e}")
                return "Error: No se pudo ejecutar el comando."
        
        logger.debug("No se detectó comando IoT en la respuesta.")
        return None

    async def load_commands_from_db(self, db: AsyncSession) -> Tuple[str, list]:
        """Carga y formatea comandos IoT desde la base de datos."""
        try:
            result = await db.execute(select(models.IoTCommand))
            iot_commands_db = result.scalars().all()
            formatted_commands = (
                "\n".join([f"- {cmd.name}: mqtt_publish:{cmd.mqtt_topic},{cmd.command_payload}" for cmd in iot_commands_db])
                if iot_commands_db
                else "No hay comandos IoT registrados."
            )
            return formatted_commands, iot_commands_db
        except Exception as e:
            logger.error(f"Error al cargar comandos IoT de la base de datos: {e}")
            raise

    async def validate_command(self, db: AsyncSession, extracted_command: str) -> Tuple[bool, str]:
        """Valida si un comando IoT existe en BD"""
        success, error_msg, command_parts = self._parse_iot_command(extracted_command)
        if not success:
            return False, error_msg
        
        if command_parts["command_name"] != "mqtt_publish":
            return False, "Solo se permiten comandos de tipo 'mqtt_publish'."
        
        topic = command_parts["topic"]
        payload = command_parts["payload"]
        
        try:
            result = await db.execute(
                select(IoTCommand).filter(
                    IoTCommand.mqtt_topic == topic,
                    IoTCommand.command_payload == payload
                )
            )
            db_command = result.scalars().first()
        except Exception as e:
            logger.error(f"Error al validar comando: {e}")
            return False, f"Error al validar comando: {str(e)}"
        
        if db_command:
            return True, ""
        else:
            return False, "Comando no reconocido en el sistema."
                