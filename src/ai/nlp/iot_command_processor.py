import asyncio
import logging
import re
import src.db.models as models
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from src.db.models import IoTCommand
from src.iot.mqtt_client import MQTTClient
from src.ai.nlp.iot_command_cache import IoTCommandCache

logger = logging.getLogger("IoTCommandProcessor")

class IoTCommandProcessor:
    def __init__(self, mqtt_client: MQTTClient):
        self._mqtt_client = mqtt_client
        self._command_cache = IoTCommandCache(ttl_seconds=300)
        self._cleanup_task = None
        self._last_parsed_command = None
        
    async def initialize(self, db: Session):
        """Inicializa el procesador de comandos IoT, pre-cargando la caché.
        
        Args:
            db: Sesión de base de datos.
        """
        logger.info("Pre-cargando caché de comandos IoT...")
        try:
            iot_commands_db = await asyncio.to_thread(lambda: db.query(models.IoTCommand).all())
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


    def _parse_iot_command(self, command_str: str) -> tuple[bool, str, Optional[dict]]:
        """
        Parsea un comando IoT y devuelve sus componentes.
        
        Args:
            command_str: String con el comando completo (iot_command:name:topic,payload o mqtt_publish:topic,payload)
            
        Returns:
            tuple: (éxito, mensaje_error, {command_name, topic, payload} o None si hay error)
        """
        result = {"command_name": None, "topic": None, "payload": None}
        
        if command_str.startswith("iot_command:"):
            command_parts = command_str[len("iot_command:"):].split(':', 1)
            if not command_parts:
                return False, "Formato de comando IoT inválido. Se esperaba 'iot_command:nombre_comando:topic,payload'.", None
            
            result["command_name"] = command_parts[0].strip()
            
            if len(command_parts) < 2:
                return False, f"Formato incompleto para el comando '{result['command_name']}'. Se esperaba 'iot_command:{result['command_name']}:topic,payload'.", None
            
            mqtt_args = command_parts[1]
            topic_payload_parts = mqtt_args.split(",", 1)
            
            if len(topic_payload_parts) < 2:
                return False, f"Formato incompleto para el comando '{result['command_name']}'. Falta el payload. Se esperaba 'iot_command:{result['command_name']}:topic,payload'.", None
            
            result["topic"] = topic_payload_parts[0].strip()
            result["payload"] = topic_payload_parts[1].strip()
            
        elif command_str.startswith("mqtt_publish:"):
            mqtt_parts = command_str[len("mqtt_publish:"):].split(',', 1)
            if len(mqtt_parts) < 2:
                return False, "Formato de comando MQTT inválido. Se esperaba 'mqtt_publish:topic,payload'.", None
            
            result["command_name"] = "mqtt_publish"
            result["topic"] = mqtt_parts[0].strip()
            result["payload"] = mqtt_parts[1].strip()
        else:
            return False, "Formato de comando IoT no reconocido.", None
        
        if not result["topic"] or not result["payload"]:
            return False, f"El tópico y el payload no pueden estar vacíos para el comando '{result['command_name']}'.", None
            
        return True, "", result

    async def process_iot_command(
        self, db: Session, full_response_content: str
    ) -> Optional[str]:
        iot_command_match = re.search(r"iot_command:(.+)", full_response_content)
        if iot_command_match:
            full_command_with_args = "iot_command:" + iot_command_match.group(1).strip()
            
            command_parts = None
            if (self._last_parsed_command and 
                self._last_parsed_command["command"] == full_command_with_args):
                command_parts = self._last_parsed_command["parts"]
                logger.debug("Reutilizando resultado de parseo previo")
                success = True
            else:
                success, error_msg, command_parts = self._parse_iot_command(full_command_with_args)
                if not success:
                    logger.error(f"Error al parsear comando IoT: {error_msg}")
                    return f"Error: {error_msg}"
            
            self._last_parsed_command = None
                
            base_command_name = command_parts["command_name"]
            logger.info(f"Base comando IoT detectado: {base_command_name}")

            cache_key = f"iot_command:{base_command_name}"
            db_command = self._command_cache.get(cache_key)
            
            if db_command is None:
                logger.debug(f"Comando '{base_command_name}' no encontrado en caché, buscando en base de datos")
                db_command = await asyncio.to_thread(
                    lambda: db.query(IoTCommand)
                    .filter(IoTCommand.name == base_command_name)
                    .first()
                )
                
                if db_command:
                    self._command_cache.set(cache_key, db_command)

            if db_command:
                logger.debug(f"Comando '{base_command_name}' encontrado en la base de datos. Tipo: {db_command.command_type}")
                
                if db_command.command_type == "mqtt":
                    try:
                        topic = command_parts["topic"]
                        payload = command_parts["payload"]

                        logger.info(
                            f"Publicando mensaje MQTT en tópico '{topic}' con payload '{payload}'"
                        )
                        await asyncio.wait_for(self._mqtt_client.publish(topic, payload), timeout=10)
                        return f"Comando MQTT '{base_command_name}' ejecutado."
                    except asyncio.TimeoutError:
                        logger.error(f"Timeout al ejecutar comando MQTT '{base_command_name}'.")
                        return f"Error: Timeout al ejecutar comando MQTT '{base_command_name}'."
                    except Exception as e:
                        logger.error(f"Error al ejecutar comando MQTT '{base_command_name}': {e}")
                        return f"Error al ejecutar comando MQTT '{base_command_name}'."
                else:
                    logger.warning(
                        f"Tipo de comando IoT desconocido o no soportado: {db_command.command_type}. Se esperaba 'mqtt'."
                    )
                    return f"Tipo de comando '{db_command.command_type}' no soportado. Solo se admiten comandos MQTT."
            else:
                logger.warning(f"Comando '{base_command_name}' no encontrado en la DB.")
                return f"Comando IoT '{base_command_name}' no reconocido."
        logger.debug("No se detectó ningún comando IoT en la respuesta.")
        return None

    async def load_commands_from_db(self, db: Session) -> tuple[str, list[IoTCommand]]:
        """Carga y formatea comandos IoT desde la base de datos, devolviendo también la lista de comandos."""
        try:
            iot_commands_db = await asyncio.to_thread(lambda: db.query(models.IoTCommand).all())
            formatted_commands = (
                "\n".join([f"- {cmd.name}: mqtt_publish:{cmd.mqtt_topic},{cmd.command_payload}" for cmd in iot_commands_db])
                if iot_commands_db
                else "No hay comandos IoT registrados."
            )
            return formatted_commands, iot_commands_db
        except Exception as e:
            logger.error(f"Error al cargar comandos IoT de la base de datos: {e}")
            raise

    async def validate_command(self, db: Session, extracted_command: str) -> tuple[bool, str]:
        """Valida si un comando IoT existe y es de tipo MQTT, con formato correcto."""
        success, error_msg, command_parts = self._parse_iot_command(extracted_command)
        if not success:
            return False, error_msg
            
        self._last_parsed_command = {
            "command": extracted_command,
            "parts": command_parts
        }
            
        command_name = command_parts["command_name"]
        
        if command_name == "mqtt_publish":
            topic = command_parts["topic"]
            payload = command_parts["payload"]
            
            db_command = await asyncio.to_thread(
                lambda: db.query(IoTCommand)
                .filter(IoTCommand.mqtt_topic == topic, IoTCommand.command_payload == payload)
                .first()
            )
            
            if db_command:
                return True, ""
            else:
                return False, f"Lo siento, el comando MQTT '{topic},{payload}' no coincide con ningún comando IoT registrado."
            
        try:
            db_command = await asyncio.to_thread(
                lambda: db.query(IoTCommand)
                .filter(IoTCommand.name == command_name)
                .first()
            )
            
            if not db_command:
                return False, f"Lo siento, no reconozco el comando '{command_name}'."
            
            if db_command.command_type != "mqtt":
                return False, f"Lo siento, el comando '{command_name}' no es de tipo MQTT."
                
            return True, ""
                
        except Exception as e:
            logger.error(f"Error al validar el comando IoT '{command_name}' en la base de datos: {e}")
            return False, "Lo siento, hubo un error al procesar tu comando."