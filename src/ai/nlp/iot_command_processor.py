import asyncio
import logging
import re
import httpx
import src.db.models as models
from typing import Optional, Tuple
from collections import defaultdict
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.db.models import IoTCommand
from src.iot.mqtt_client import MQTTClient
from src.ai.nlp.iot_command_cache import IoTCommandCache

logger = logging.getLogger("IoTCommandProcessor")

class IoTCommandProcessor:
    def __init__(self, mqtt_client: MQTTClient, locations: list[str]):
        self._mqtt_client = mqtt_client
        self._command_cache = IoTCommandCache(ttl_seconds=60)
        self._cleanup_task = None
        self._last_parsed_command = None
        self.locations = locations # Store locations
        
        self._last_command_time = defaultdict(float)
        self._min_interval_seconds = 1.0
        self._max_commands_per_minute = 10
        self._command_counter = defaultdict(list)
        
        logger.info(f"IoTCommandProcessor inicializado con throttling: "
                   f"{self._min_interval_seconds}s minimo, "
                   f"{self._max_commands_per_minute} comandos/minuto maximo")
        
    async def initialize(self, db: AsyncSession):
        """Inicializa el procesador de comandos IoT, pre-cargando la cache."""
        logger.info("Pre-cargando cache de comandos IoT...")
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
            
            logger.info(f"Cache pre-cargado con {len(iot_commands_db)} comandos IoT")
        except Exception as e:
            logger.error(f"Error al pre-cargar cache de comandos IoT: {e}")
            
        self._start_cleanup_task()
        
    def _start_cleanup_task(self):
        """Inicia una tarea periodica para limpiar entradas expiradas del cache."""
        async def cleanup_loop():
            while True:
                try:
                    removed = self._command_cache.cleanup_expired()
                    if removed > 0:
                        logger.debug(f"Limpieza automatica: {removed} entradas expiradas eliminadas del cache")
                    await asyncio.sleep(60)
                except asyncio.CancelledError:
                    logger.info("Tarea de limpieza de cache cancelada")
                    break
                except Exception as e:
                    logger.error(f"Error en tarea de limpieza de cache: {e}")
                    await asyncio.sleep(60)
                    
        if self._cleanup_task is not None:
            self._cleanup_task.cancel()
            
        self._cleanup_task = asyncio.create_task(cleanup_loop())
        logger.info("Tarea de limpieza automatica de cache iniciada")
        
    def invalidate_command_cache(self, command_name: Optional[str] = None):
        """Invalida la cache de comandos IoT."""
        if command_name:
            cache_key = f"iot_command:{command_name}"
            self._command_cache.invalidate(cache_key)
            logger.debug(f"Cache invalidado para comando '{command_name}'")
        else:
            self._command_cache.clear()
            logger.debug("Cache de comandos IoT completamente invalidado")

    def _parse_iot_command(self, command_str: str) -> Tuple[bool, str, Optional[dict]]:
        """Parsea un comando IoT y devuelve sus componentes."""
        result = {"command_name": None, "topic": None, "payload": None}
        
        if command_str.startswith("mqtt_publish:"):
            mqtt_parts = command_str[len("mqtt_publish:"):].split(',', 1)
            if len(mqtt_parts) < 2:
                return False, "Formato de comando MQTT invalido. Se esperaba 'mqtt_publish:topic,payload'.", None
            
            result["command_name"] = "mqtt_publish"
            result["topic"] = mqtt_parts[0].strip()
            result["payload"] = mqtt_parts[1].strip()
            
            # CORRECCION: Limpiar caracteres especiales no deseados
            result["topic"] = result["topic"].rstrip('.,!?;:"\' \n\r\t')
            result["payload"] = result["payload"].rstrip('.,!?;:"\' \n\r\t')
        else:
            return False, "Formato de comando IoT no reconocido. Solo se acepta 'mqtt_publish:topic,payload'.", None
        
        if not result["topic"] or not result["payload"]:
            return False, f"El topico y el payload no pueden estar vacios para el comando '{result['command_name']}'.", None
            
        return True, "", result

    def _check_command_throttle(self, user_id: int) -> Tuple[bool, str]:
        """Verifica si el usuario puede ejecutar un comando basado en throttling."""
        now = time.time()
        
        last_time = self._last_command_time.get(user_id, 0)
        time_since_last = now - last_time
        
        if time_since_last < self._min_interval_seconds:
            wait_time = round(self._min_interval_seconds - time_since_last, 1)
            msg = f"Por favor espera {wait_time}s antes de enviar otro comando."
            logger.warning(f"Throttle: usuario {user_id} - intervalo insuficiente ({time_since_last:.1f}s)")
            return False, msg
        
        minute_ago = now - 60
        recent_commands = [t for t in self._command_counter[user_id] if t > minute_ago]
        self._command_counter[user_id] = recent_commands
        
        if len(recent_commands) >= self._max_commands_per_minute:
            msg = f"Demasiados comandos en poco tiempo. Maximo {self._max_commands_per_minute}/minuto."
            logger.warning(f"Throttle: usuario {user_id} - limite de comandos por minuto excedido")
            return False, msg
        
        return True, ""
    
    def _record_command(self, user_id: int) -> None:
        """Registra un comando ejecutado para el throttling"""
        now = time.time()
        self._last_command_time[user_id] = now
        self._command_counter[user_id].append(now)
        logger.debug(f"Comando registrado para usuario {user_id} a las {now}")
    
    def _extract_device_info_from_prompt(self, prompt: str, response: str) -> Tuple[str, str, bool]:
        """Extrae tipo de dispositivo y ubicacion del prompt y respuesta del LLM,
        indicando si la ubicacion fue encontrada en el prompt original."""
        device_types = ["luz", "puerta", "ventilador", "sensor", "clima", "actuador", "valve", 
                       "lamp", "light", "door", "fan", "heater", "ac"]
        locations = ["salon", "sala", "cocina", "dormitorio", "pasillo", "bano", "garaje", "principal", 
                    "barra", "isla", "lavandera", "invitados", "habitacion", "living", "comedor"]
        
        prompt_lower = prompt.lower()
        response_lower = response.lower()
        
        device_type = ""
        for dt in device_types:
            if dt in prompt_lower:
                device_type = dt
                break
        
        location = ""
        location_in_prompt = False
        for loc in locations:
            if loc in prompt_lower:
                location = loc
                location_in_prompt = True
                break
        
        # Si no se encontro en el prompt, buscar en la respuesta del LLM
        if not location:
            for loc in locations:
                if loc in response_lower:
                    location = loc
                    break
        
        return device_type or "desconocido", location or "desconocida", location_in_prompt
    
    def _find_similar_commands(self, iot_commands_db: list, device_type: str, location: str) -> list:
        """Encuentra comandos similares/variantes para una ubicacion especifica."""
        similar = []
        location_lower = location.lower()
        device_type_lower = device_type.lower()
        
        for cmd in iot_commands_db:
            name_lower = cmd.name.lower()
            topic_lower = cmd.mqtt_topic.lower()
            
            has_location = location_lower in name_lower or location_lower in topic_lower
            has_device_type = device_type_lower in name_lower or device_type_lower in topic_lower
            
            if has_location and has_device_type:
                similar.append(cmd)
        
        return similar
    
    def _extract_zone_from_command(self, cmd_name: str, location: str) -> Optional[str]:
        """
        Extrae la zona especifica de un nombre de comando.
        
        Ejemplos:
        - "Encender Luz Cocina Barra" con location="cocina" -> "barra"
        - "Encender Luz Garaje" con location="garaje" -> None
        - "Encender Luz Habitacion Principal" con location="habitacion" -> "principal"
        """
        cmd_lower = cmd_name.lower()
        location_lower = location.lower()
        
        zone_keywords = {
            "barra": ["barra"],
            "isla": ["isla"],
            "principal": ["principal"],
            "invitados": ["invitados", "invitado"],
        }
        
        found_zones = []
        for zone_name, keywords in zone_keywords.items():
            for keyword in keywords:
                if keyword in cmd_lower and location_lower in cmd_lower:
                    found_zones.append(zone_name)
                    break
        
        return found_zones[0] if found_zones else None
    
    async def detect_ambiguous_commands(
        self, db: AsyncSession, prompt: str, response: str, iot_commands_db: list
    ) -> Optional[str]:
        """
        Detecta si la respuesta del LLM intenta ejecutar un comando ambiguo.
        Solo marca como ambiguo si hay REALMENTE multiples zonas diferentes o si la ubicacion no fue especificada por el usuario.
        """
        iot_match = re.search(r"mqtt_publish:(.+)", response)
        if not iot_match:
            return None
        
        device_type, location, location_in_prompt = self._extract_device_info_from_prompt(prompt, response)
        
        # Si la ubicación no fue especificada por el usuario en el prompt original
        # y hay múltiples comandos para ese tipo de dispositivo, preguntar por la ubicación.
        if not location_in_prompt and device_type != "desconocido":
            similar_commands_by_device_type = self._find_similar_commands(iot_commands_db, device_type, "")
            if len(similar_commands_by_device_type) > 1:
                all_possible_locations = set()
                for cmd in similar_commands_by_device_type:
                    for loc_keyword in self.locations:
                        if loc_keyword in cmd.name.lower() or loc_keyword in cmd.mqtt_topic.lower():
                            all_possible_locations.add(loc_keyword)
                
                if len(all_possible_locations) > 1:
                    ambiguity_msg = (
                        f"Detecte multiples opciones de {device_type}. "
                        f"Cual {device_type} deseas? {', '.join(sorted(list(all_possible_locations)))}?"
                    )
                    logger.info(f"Ambiguedad por tipo de dispositivo detectada (ubicacion no especificada por usuario): {all_possible_locations}")
                    return ambiguity_msg
        
        # Lógica existente para cuando la ubicación es detectada (ya sea por prompt o por LLM)
        # y hay múltiples comandos para ese tipo de dispositivo y ubicación.
        if location == "desconocida":
            logger.debug("Ubicacion no detectada, buscando ambiguedad solo por tipo de dispositivo.")
            similar_commands = self._find_similar_commands(iot_commands_db, device_type, "")
        else:
            similar_commands = self._find_similar_commands(iot_commands_db, device_type, location)
        
        logger.debug(f"Comandos similares encontrados para {device_type} en {location}: {len(similar_commands)}")
        
        if len(similar_commands) > 1:
            if location == "desconocida":
                # Esta rama ya fue cubierta por la nueva lógica de `not location_in_prompt`
                # Si llegamos aquí, significa que `location_in_prompt` era True o `device_type` era desconocido
                # o solo había una ubicación posible.
                return None
            else:
                zones_found = {}
                for cmd in similar_commands:
                    zone = self._extract_zone_from_command(cmd.name, location)
                    if zone:
                        zones_found[zone] = zones_found.get(zone, 0) + 1
                    else:
                        zones_found["default"] = zones_found.get("default", 0) + 1
                
                unique_zones = [z for z in zones_found.keys() if z != "default"]
                
                if len(unique_zones) > 1:
                    ambiguity_msg = (
                        f"Detecte multiples opciones de {device_type} en {location}: "
                        f"{', '.join(sorted(unique_zones))}. Cual especificamente?"
                    )
                    logger.info(f"Ambiguedad REAL detectada: {unique_zones}")
                    return ambiguity_msg
                
                logger.debug(f"Sin ambiguedad real: {len(similar_commands)} comando(s) pero solo 1 zona efectiva")
        
        return None

    async def process_iot_command(
        self, db: AsyncSession, full_response_content: str, token: str, user_id: int = None
    ) -> Optional[str]:
        """Procesa y ejecuta un comando IoT extraido de la respuesta del LLM"""
        
        if user_id:
            throttle_ok, throttle_msg = self._check_command_throttle(user_id)
            if not throttle_ok:
                logger.warning(f"Comando bloqueado por throttle para usuario {user_id}")
                return throttle_msg
        
        iot_command_match = re.search(r"mqtt_publish:(.+)", full_response_content)
        if iot_command_match:
            full_command_with_args = "mqtt_publish:" + iot_command_match.group(1).strip()
            
            # CORRECCION: Limpiar caracteres especiales y espacios extras
            full_command_with_args = full_command_with_args.rstrip('.,!?;:"\' \n\r\t')
            
            success, error_msg, command_parts = self._parse_iot_command(full_command_with_args)
            if not success:
                logger.error(f"Error al parsear comando IoT: {error_msg}")
                return f"Error: {error_msg}"
            
            topic = command_parts["topic"].strip()
            payload = command_parts["payload"].strip()
            
            # CORRECCION ADICIONAL: Limpiar comillas adicionales del payload
            payload = payload.rstrip('.,!?;:"\' \n\r\t')
            topic = topic.rstrip('.,!?;:"\' \n\r\t')
            
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
                
                if user_id:
                    self._record_command(user_id)
                
                logger.info(f"Comando ejecutado: {db_command.name}")
                return f"OK {db_command.name}"

            except httpx.TimeoutException:
                logger.error("Timeout al enviar comando a Arduino")
                return "Error: Timeout al enviar comando a Arduino."
            except httpx.HTTPStatusError as e:
                logger.error(f"Error HTTP: {e.response.status_code}")
                return "Error: No se pudo ejecutar el comando."
            except Exception as e:
                logger.error(f"Error al ejecutar comando: {e}")
                return "Error: No se pudo ejecutar el comando."
        
        logger.debug("No se detecto comando IoT en la respuesta.")
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
            