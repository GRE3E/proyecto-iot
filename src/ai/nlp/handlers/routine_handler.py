import logging
import re
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy import select
from src.db.models import IoTCommand

logger = logging.getLogger("RoutineHandler")

ROUTINE_CREATION_REGEX = re.compile(r"crear rutina: (.+?); disparador: (.+?); acciones: (.+)", re.IGNORECASE)
MINUTES_IN_REGEX = re.compile(r"en\s+(\d+)\s+minutos", re.IGNORECASE)
NATURAL_TTS_ROUTINE_REGEX = re.compile(r"(?:avisame|notificame|dime)\s+(?:a\s+las\s+(\d{1,2})(?:[:](\d{2}))?(?:\s*(?:am|pm))?|en\s+(\d+)\s+minutos)(?:\s+que\s+(.+))?", re.IGNORECASE)

class RoutineHandler:
    """Gestiona la creación, validación y ejecución de rutinas."""
    
    def __init__(self, memory_brain, iot_command_processor, tts_module):
        self._memory_brain = memory_brain
        self._iot_command_processor = iot_command_processor
        self._tts_module = tts_module
    
    async def handle_routine_creation(self, response_content: str, user_id: int, user_name: str, is_owner: bool) -> Optional[dict]:
        """Procesa la creación de rutinas desde la respuesta del LLM"""
        # Intentar procesar como rutina TTS natural primero
        natural_tts_routine = await self._handle_natural_tts_routine_creation(response_content, user_id, user_name, is_owner)
        if natural_tts_routine:
            return natural_tts_routine

        # Si no es una rutina TTS natural, intentar procesar como rutina estructurada
        routine_match = ROUTINE_CREATION_REGEX.match(response_content)
        if not routine_match:
            return None
        
        routine_name = routine_match.group(1).strip()
        routine_trigger = routine_match.group(2).strip()
        routine_actions_str = routine_match.group(3).strip()
        
        logger.info(f"Rutina detectada - Nombre: '{routine_name}', Trigger: '{routine_trigger}', Acciones: '{routine_actions_str}'")
        
        all_actions = [action.strip() for action in routine_actions_str.split(',') if action.strip()]
        mqtt_actions = [action for action in all_actions if action.startswith('mqtt_publish:')]
        tts_actions = [action for action in all_actions if action.startswith('tts_speak:')]

        routine_actions = mqtt_actions + tts_actions

        try:
            trigger_text = routine_trigger.lower().strip()
            
            time_match = re.search(r"(\d{1,2}):(\d{2})(?:\s*(am|pm))?", trigger_text)
            minutes_in_match = MINUTES_IN_REGEX.search(trigger_text)

            normalized_time = None
            trigger_type = "time_based"

            if time_match:
                hour = int(time_match.group(1))
                minute = int(time_match.group(2))
                ampm = time_match.group(3)

                if ampm:
                    if ampm == "pm" and hour != 12:
                        hour += 12
                    if ampm == "am" and hour == 12:
                        hour = 0
                normalized_time = f"{hour:02d}:{minute:02d}"
            elif minutes_in_match:
                minutes_to_add = int(minutes_in_match.group(1))
                future_time = datetime.now() + timedelta(minutes=minutes_to_add)
                normalized_time = f"{future_time.hour:02d}:{future_time.minute:02d}"
                trigger_type = "time_based"
            else:
                raise ValueError(f"Formato de disparador inválido: {routine_trigger}")

            pattern = {
                "type": trigger_type,
                "hour": normalized_time,
                "confidence": 1.0
            }

            command_ids = await self._extract_mqtt_command_ids_from_actions(mqtt_actions, routine_name)
            
            if not routine_actions: # Cambiado de command_ids a routine_actions
                raise ValueError("No se encontraron acciones válidas (IoT o TTS) para la rutina especificada")

            async with self._get_db_session() as db:
                new_routine = await self._memory_brain.routine_manager.create_routine_from_pattern(
                    db,
                    user_id=user_id,
                    pattern=pattern,
                    actions=routine_actions, # Pasar todas las acciones aquí
                    command_ids=command_ids,
                    confirmed=True
                )
                
                if routine_name and routine_name != new_routine.name:
                    new_routine = await self._memory_brain.routine_manager.update_routine(
                        db,
                        new_routine.id,
                        name=routine_name
                    )
                
                await db.commit()
                await db.refresh(new_routine)
                
                response_text = f"He creado la rutina '{new_routine.name}' que se ejecutará a las {normalized_time} con las acciones especificadas."
                
                return {
                    "response": response_text,
                    "user_name": user_name,
                    "is_owner": is_owner
                }
                
        except ValueError as e:
            logger.error(f"Error de validación al crear la rutina: {e}")
            return {
                "response": f"No pude crear la rutina: {str(e)}",
                "error": "Error de validación",
                "user_name": user_name,
                "is_owner": is_owner
            }
        except Exception as e:
            logger.error(f"Error inesperado al crear la rutina: {e}", exc_info=True)
            return {
                "response": f"No pude crear la rutina debido a un error interno: {str(e)}",
                "error": "Error al crear la rutina",
                "user_name": user_name,
                "is_owner": is_owner
            }
    
    async def _extract_mqtt_command_ids_from_actions(self, routine_actions: List[str], routine_name: str) -> List[int]:
        """Extrae los IDs de comandos IoT de las acciones de rutina"""
        command_ids = []
        
        for action in routine_actions:
            action = action.strip()
            if not action or not action.startswith('mqtt_publish:'):
                continue
                
            try:
                command_part = action.replace('mqtt_publish:', '', 1).strip()
                
                logger.info(f"Procesando acción: '{command_part}'")
                
                parts = command_part.split(',')
                
                if len(parts) < 2:
                    logger.warning(f"Payload no encontrado en '{command_part}', intentando inferir...")
                    parts = await self._infer_payload_from_context(parts, routine_name, command_part)
                    
                    if not parts or len(parts) < 2:
                        continue
                    
                topic = parts[0].strip()
                payload = ','.join(parts[1:]).strip()
                
                logger.info(f"Buscando comando - Topic: '{topic}', Payload: '{payload}'")
                
                async with self._get_db_session() as db:
                    result = await db.execute(
                        select(IoTCommand).filter(
                            IoTCommand.mqtt_topic == topic,
                            IoTCommand.command_payload == payload
                        )
                    )
                    iot_cmd = result.scalars().first()
                    
                    if iot_cmd:
                        command_ids.append(iot_cmd.id)
                        logger.info(f"✓ Comando IoT encontrado: {iot_cmd.name} (ID: {iot_cmd.id})")
                    else:
                        logger.warning(f"✗ Comando IoT no encontrado para topic='{topic}', payload='{payload}'")
                        
            except Exception as e:
                logger.error(f"Error parseando acción '{action}': {e}", exc_info=True)
                continue
        
        return command_ids
    
    async def _infer_payload_from_context(self, parts: List[str], routine_name: str, command_part: str) -> List[str]:
        """Intenta inferir el payload del contexto y nombre de la rutina"""
        if 'lights' in command_part.lower():
            if any(word in routine_name.lower() for word in ['encender', 'prender', 'activar', 'on']):
                parts.append('ON')
                logger.info(f"Payload inferido: ON para '{command_part}'")
            elif any(word in routine_name.lower() for word in ['apagar', 'desactivar', 'off']):
                parts.append('OFF')
                logger.info(f"Payload inferido: OFF para '{command_part}'")
            else:
                logger.error(f"No se pudo inferir el payload para '{command_part}'")
                return []
        elif 'doors' in command_part.lower():
            if any(word in routine_name.lower() for word in ['abrir', 'abre', 'open']):
                parts.append('OPEN')
                logger.info(f"Payload inferido: OPEN para '{command_part}'")
            elif any(word in routine_name.lower() for word in ['cerrar', 'cierra', 'close']):
                parts.append('CLOSE')
                logger.info(f"Payload inferido: CLOSE para '{command_part}'")
            else:
                logger.error(f"No se pudo inferir el payload para '{command_part}'")
                return []
        elif 'actuators' in command_part.lower():
            if any(word in routine_name.lower() for word in ['encender', 'prender', 'activar', 'on']):
                parts.append('ON')
                logger.info(f"Payload inferido: ON para '{command_part}'")
            elif any(word in routine_name.lower() for word in ['apagar', 'desactivar', 'off']):
                parts.append('OFF')
                logger.info(f"Payload inferido: OFF para '{command_part}'")
            else:
                logger.error(f"No se pudo inferir el payload para '{command_part}'")
                return []
        else:
            logger.error(f"Formato inválido para acción '{command_part}': se esperaba topic,payload")
            return []
        
        return parts
    
    def _extract_tts_messages_from_actions(self, routine_actions: List[str]) -> List[str]:
        """Extrae los mensajes de TTS de las acciones de rutina."""
        tts_messages = []
        for action in routine_actions:
            action = action.strip()
            if action.startswith('tts_speak:'):
                message = action.replace('tts_speak:', '', 1).strip()
                if message:
                    tts_messages.append(message)
        return tts_messages

    async def execute_automatic_routines(self, user_id: int, token: str):
        """Verifica y ejecuta rutinas automáticas de Memory Brain"""
        try:
            current_context = {
                "hour": datetime.now().hour,
                "day": datetime.now().weekday(),
                "timestamp": datetime.now().isoformat()
            }
            
            async with self._get_db_session() as db:
                automatic_actions = await self._memory_brain.routine_manager.check_routine_triggers(
                    db, user_id, current_context
                )
                
                if automatic_actions:
                    logger.info(f"Rutinas automáticas detectadas para usuario {user_id}: {len(automatic_actions)}")
                    
                    tts_messages = self._extract_tts_messages_from_actions(automatic_actions)
                    
                    for message in tts_messages:
                        if self._tts_module and self._tts_module.is_online():
                            logger.info(f"Enviando mensaje TTS de rutina automática: {message}")
                            try:
                                await self._tts_module.generate_audio_stream(message)
                            except Exception as tts_e:
                                logger.error(f"Error al enviar mensaje TTS de rutina automática: {tts_e}")

                    for action in automatic_actions:
                        if action.startswith('mqtt_publish:'):
                            try:
                                await self._iot_command_processor.process_iot_command(
                                    db, action, token, user_id=user_id
                                )
                                
                                # Generar mensaje de confirmación y enviarlo a TTS
                                # TODO: Considerar si se necesita un mensaje de confirmación específico para MQTT o si el TTS ya cubre esto
                                # routine = await self._memory_brain.routine_manager.get_routine_by_id(db, action.routine_id)
                                # if routine and self._tts_module and self._tts_module.is_online():
                                #     confirmation_message = f"Rutina '{routine.name}' ejecutada."
                                #     logger.info(f"Enviando a TTS: {confirmation_message}")
                                #     try:
                                #         await self._tts_module.generate_audio_stream(confirmation_message)
                                #     except Exception as tts_e:
                                #         logger.error(f"Error al enviar mensaje de rutina a TTS: {tts_e}")
                            except Exception as e:
                                logger.error(f"Error ejecutando rutina automática: {e}")
        except Exception as e:
            logger.warning(f"Error verificando rutinas automáticas: {e}")
    
    async def handle_routine_by_name(self, user_id: int, routine_name: str, token: str) -> Optional[dict]:
        """Busca y ejecuta una rutina por nombre"""
        try:
            async with self._get_db_session() as db:
                # Buscar rutinas del usuario que coincidan con el nombre
                user_routines = await self._memory_brain.routine_manager.get_user_routines(
                    db, user_id, confirmed_only=True, enabled_only=True
                )
                
                # Buscar coincidencia exacta o parcial
                matching_routine = None
                for routine in user_routines:
                    if routine_name.lower() in routine.name.lower():
                        matching_routine = routine
                        break
                
                if not matching_routine:
                    return {
                        "response": f"No encontré una rutina llamada '{routine_name}'. Puedes ver tus rutinas disponibles preguntando '¿qué rutinas tengo?'",
                        "error": "Rutina no encontrada"
                    }
                
                # Extraer y ejecutar acciones de la rutina
                all_actions = matching_routine.actions
                
                tts_messages = self._extract_tts_messages_from_actions(all_actions)
                mqtt_actions = [action for action in all_actions if action.startswith('mqtt_publish:')]
                
                executed_actions_summary = []

                # Ejecutar acciones TTS
                for message in tts_messages:
                    if self._tts_module and self._tts_module.is_online():
                        logger.info(f"Enviando mensaje TTS de rutina por nombre: {message}")
                        try:
                            await self._tts_module.generate_audio_stream(message)
                            executed_actions_summary.append(f"TTS: '{message}'")
                        except Exception as tts_e:
                            logger.error(f"Error al enviar mensaje TTS de rutina por nombre: {tts_e}")
                
                # Ejecutar acciones MQTT
                mqtt_command_names = []
                for action in mqtt_actions:
                    try:
                        # process_iot_command espera el string completo de la acción, no solo el comando
                        command_name = await self._iot_command_processor.process_iot_command(
                            db, action, token, user_id=user_id
                        )
                        if command_name:
                            mqtt_command_names.append(command_name)
                            executed_actions_summary.append(f"MQTT: '{command_name}'")
                    except Exception as e:
                        logger.error(f"Error ejecutando acción MQTT de rutina por nombre: {e}")

                if executed_actions_summary:
                    actions_str = ", ".join(executed_actions_summary)
                    return {
                        "response": f"Ejecuté la rutina '{matching_routine.name}' con éxito. Acciones realizadas: {actions_str}",
                        "command": f"rutina_ejecutada:{matching_routine.name}"
                    }
                else:
                    return {
                        "response": f"La rutina '{matching_routine.name}' no pudo ser ejecutada o no tiene acciones válidas. Verifica que esté configurada correctamente.",
                        "error": "Error al ejecutar rutina"
                    }
                    
        except Exception as e:
            logger.error(f"Error al buscar/ejecutar rutina por nombre: {e}")
            return {
                "response": f"Error al ejecutar la rutina: {str(e)}",
                "error": "Error interno"
            }
    
    async def get_user_routines_list(self, user_id: int) -> Optional[dict]:
        """Obtiene la lista de rutinas del usuario"""
        try:
            async with self._get_db_session() as db:
                user_routines = await self._memory_brain.routine_manager.get_user_routines(
                    db, user_id, confirmed_only=True, enabled_only=True
                )
                
                if not user_routines:
                    return {
                        "response": "No tienes rutinas programadas. Puedes crear una diciendo por ejemplo: 'crear rutina: Despertar; disparador: todos los días a las 7am; acciones: encender luz de la habitación'"
                    }
                
                routines_list = []
                for routine in user_routines:
                    trigger_info = ""
                    if routine.trigger_type == "time_based" and routine.trigger:
                        hour = routine.trigger.get("hour", "?")
                        trigger_info = f"a las {hour}:00"
                    
                    actions_count = len(routine.iot_commands) if routine.iot_commands else 0
                    routines_list.append(f"• {routine.name} ({trigger_info}) - {actions_count} acciones")
                
                routines_text = "\n".join(routines_list)
                return {
                    "response": f"Tienes {len(user_routines)} rutinas programadas:\n\n{routines_text}\n\nPara ejecutar una rutina, di por ejemplo: 'ejecutar rutina de despertar'"
                    }
                
        except Exception as e:
            logger.error(f"Error al obtener rutinas del usuario: {e}")
            return {
                "response": "Error al obtener tus rutinas. Por favor, inténtalo de nuevo.",
                "error": "Error interno"
            }
    
    def _get_db_session(self):
        """Helper para obtener sesión de base de datos"""
        from src.db.database import get_db
        return get_db()

    async def _handle_natural_tts_routine_creation(self, response_content: str, user_id: int, user_name: str, is_owner: bool) -> Optional[dict]:
        """Procesa la creación de rutinas TTS a partir de lenguaje natural."""
        natural_match = NATURAL_TTS_ROUTINE_REGEX.match(response_content)
        if not natural_match:
            return None

        hour_str, minute_str, ampm, minutes_in_str, custom_message = natural_match.groups()

        normalized_time = None
        trigger_type = "time_based"
        routine_name_prefix = "Aviso"
        tts_message = "Aquí está tu aviso."

        if hour_str:
            hour = int(hour_str)
            minute = int(minute_str) if minute_str else 0

            if ampm:
                if ampm.lower() == "pm" and hour != 12:
                    hour += 12
                if ampm.lower() == "am" and hour == 12:
                    hour = 0
            
            normalized_time = f"{hour:02d}:{minute:02d}"
            routine_name = f"{routine_name_prefix} {hour:02d}:{minute:02d}"
            tts_message = f"Son las {hour:02d} y {minute:02d}."
        elif minutes_in_str:
            minutes_to_add = int(minutes_in_str)
            future_time = datetime.now() + timedelta(minutes=minutes_to_add)
            normalized_time = f"{future_time.hour:02d}:{future_time.minute:02d}"
            trigger_type = "time_based"
            routine_name = f"{routine_name_prefix} en {minutes_to_add} minutos"
            tts_message = f"Han pasado {minutes_to_add} minutos."
        else:
            return None # No match for time

        if custom_message:
            tts_message = custom_message.strip()

        pattern = {
            "type": trigger_type,
            "hour": normalized_time,
            "confidence": 1.0
        }
        routine_actions = [f"tts_speak:{tts_message}"]

        try:
            async with self._get_db_session() as db:
                new_routine = await self._memory_brain.routine_manager.create_routine_from_pattern(
                    db,
                    user_id=user_id,
                    pattern=pattern,
                    actions=routine_actions,
                    command_ids=[], # No IoT commands for TTS-only routines
                    confirmed=True
                )
                # Update routine name if a more specific one was generated
                if routine_name and routine_name != new_routine.name:
                    new_routine = await self._memory_brain.routine_manager.update_routine(
                        db,
                        new_routine.id,
                        name=routine_name
                    )
                await db.commit()
                await db.refresh(new_routine)

                response_text = f"He programado tu aviso '{new_routine.name}' para las {normalized_time} diciendo: '{tts_message}'."
                return {
                    "response": response_text,
                    "user_name": user_name,
                    "is_owner": is_owner
                }
        except ValueError as e:
            logger.error(f"Error de validación al crear la rutina TTS natural: {e}")
            return {
                "response": f"No pude programar tu aviso: {str(e)}",
                "error": "Error de validación",
                "user_name": user_name,
                "is_owner": is_owner
            }
        except Exception as e:
            logger.error(f"Error inesperado al crear la rutina TTS natural: {e}", exc_info=True)
            return {
                "response": f"No pude programar tu aviso debido a un error interno: {str(e)}",
                "error": "Error al crear aviso",
                "user_name": user_name,
                "is_owner": is_owner
            }
        