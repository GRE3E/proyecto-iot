import logging
import re
from typing import Optional, List
from datetime import datetime
from sqlalchemy import select
from src.db.models import IoTCommand

logger = logging.getLogger("RoutineHandler")

ROUTINE_CREATION_REGEX = re.compile(r"crear rutina: (.+?); disparador: (.+?); acciones: (.+)", re.IGNORECASE)

class RoutineHandler:
    """Gestiona la creación, validación y ejecución de rutinas."""
    
    def __init__(self, memory_brain, iot_command_processor):
        self._memory_brain = memory_brain
        self._iot_command_processor = iot_command_processor
    
    async def handle_routine_creation(self, response_content: str, user_id: int, user_name: str, is_owner: bool) -> Optional[dict]:
        """Procesa la creación de rutinas desde la respuesta del LLM"""
        routine_match = ROUTINE_CREATION_REGEX.match(response_content)
        if not routine_match:
            return None
        
        routine_name = routine_match.group(1).strip()
        routine_trigger = routine_match.group(2).strip()
        routine_actions_str = routine_match.group(3).strip()
        
        logger.info(f"Rutina detectada - Nombre: '{routine_name}', Trigger: '{routine_trigger}', Acciones: '{routine_actions_str}'")
        
        action_parts = routine_actions_str.split('mqtt_publish:')
        routine_actions = ['mqtt_publish:' + action.strip() for action in action_parts if action.strip()]

        try:
            trigger_text = routine_trigger.lower().strip()
            time_match = re.search(r"(\d{1,2}):(\d{2})(?:\s*(am|pm))?", trigger_text)
            if not time_match:
                raise ValueError(f"Formato de disparador inválido: {routine_trigger}")

            hour = int(time_match.group(1))
            minute = int(time_match.group(2))
            ampm = time_match.group(3)

            if ampm:
                if ampm == "pm" and hour != 12:
                    hour += 12
                if ampm == "am" and hour == 12:
                    hour = 0

            normalized_time = f"{hour:02d}:{minute:02d}"

            pattern = {
                "type": "time_based",
                "hour": normalized_time,
                "confidence": 1.0
            }

            command_ids = await self._extract_command_ids_from_actions(routine_actions, routine_name)
            
            if not command_ids:
                raise ValueError("No se encontraron comandos IoT válidos para las acciones especificadas")

            async with self._get_db_session() as db:
                new_routine = await self._memory_brain.routine_manager.create_routine_from_pattern(
                    db,
                    user_id=user_id,
                    pattern=pattern,
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
    
    async def _extract_command_ids_from_actions(self, routine_actions: List[str], routine_name: str) -> List[int]:
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
                    for action in automatic_actions:
                        try:
                            await self._iot_command_processor.process_iot_command(
                                db, action, token, user_id=user_id
                            )
                        except Exception as e:
                            logger.error(f"Error ejecutando rutina automática: {e}")
        except Exception as e:
            logger.warning(f"Error verificando rutinas automáticas: {e}")
    
    def _get_db_session(self):
        """Helper para obtener sesión de base de datos"""
        from src.db.database import get_db
        return get_db()
        