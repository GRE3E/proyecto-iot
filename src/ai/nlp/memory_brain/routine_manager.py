import logging
import os
import asyncio
import wave
import pyaudio
from datetime import datetime
from typing import Optional, Dict, List, Any
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Routine, IoTCommand
import httpx
from src.auth.auth_service import AuthService

logger = logging.getLogger("RoutineManager")

class RoutineManager:

    async def create_routine_from_pattern(
        self, 
        db: AsyncSession, 
        user_id: int, 
        pattern: Dict[str, Any], 
        actions: Optional[List[str]] = None,
        command_ids: Optional[List[int]] = None,
        confirmed: bool = False
    ) -> Routine:
        routine_name = self._generate_routine_name(pattern)
        trigger_type = pattern.get("type")

        routine = Routine(
            user_id=user_id,
            name=routine_name,
            description="Rutina generada automáticamente",
            trigger=pattern,
            trigger_type=trigger_type,
            confirmed=confirmed,
            confidence=pattern.get("confidence", 0.0),
            actions=actions if actions is not None else [] # Asignar las acciones aquí
        )

        if command_ids:
            result = await db.execute(
                select(IoTCommand).filter(IoTCommand.id.in_(command_ids))
            )
            commands = result.scalars().all()
            routine.iot_commands = commands

        db.add(routine)
        await db.commit()
        await db.refresh(routine)
        logger.info(f"Rutina creada: {routine_name} (ID: {routine.id})")
        return routine

    async def get_user_routines(
        self, 
        db: AsyncSession, 
        user_id: int, 
        confirmed_only: bool = False,
        enabled_only: bool = False
    ) -> List[Routine]:
        query = (
            select(Routine)
            .options(selectinload(Routine.iot_commands))
            .filter(Routine.user_id == user_id)
        )
        
        if confirmed_only:
            query = query.filter(Routine.confirmed)
        
        if enabled_only:
            query = query.filter(Routine.enabled)

        result = await db.execute(query)
        return result.scalars().all()

    async def get_routine_by_id(self, db: AsyncSession, routine_id: int) -> Optional[Routine]:
        result = await db.execute(
            select(Routine)
            .options(selectinload(Routine.iot_commands))
            .filter(Routine.id == routine_id)
        )
        return result.scalars().first()

    async def confirm_routine(self, db: AsyncSession, routine_id: int) -> Optional[Routine]:
        routine = await self.get_routine_by_id(db, routine_id)
        if routine:
            routine.confirmed = True
            routine.updated_at = datetime.now()
            await db.commit()
            await db.refresh(routine)
            logger.info(f"Rutina confirmada: {routine.name} (ID: {routine_id})")
            return routine
        return None

    async def reject_routine(self, db: AsyncSession, routine_id: int) -> bool:
        routine = await self.get_routine_by_id(db, routine_id)
        if routine:
            await db.delete(routine)
            await db.commit()
            logger.info(f"Rutina rechazada y eliminada: {routine.name} (ID: {routine_id})")
            return True
        return False

    async def update_routine(
        self, 
        db: AsyncSession, 
        routine_id: int, 
        **kwargs
    ) -> Optional[Routine]:
        routine = await self.get_routine_by_id(db, routine_id)
        if not routine:
            return None

        allowed_fields = ['name', 'description', 'trigger', 'enabled', 'confidence', 'actions']
        for field, value in kwargs.items():
            if field in allowed_fields:
                setattr(routine, field, value)

        if 'command_ids' in kwargs and kwargs['command_ids'] is not None:
            ids = kwargs['command_ids']
            try:
                result = await db.execute(
                    select(IoTCommand).filter(IoTCommand.id.in_(ids))
                )
                commands = result.scalars().all()
                routine.iot_commands = commands
            except Exception:
                pass

        routine.updated_at = datetime.now()
        await db.commit()
        await db.refresh(routine)
        logger.info(f"Rutina actualizada: {routine.name} (ID: {routine_id})")
        return routine

    async def delete_routine(self, db: AsyncSession, routine_id: int) -> bool:
        routine = await self.get_routine_by_id(db, routine_id)
        if routine:
            await db.delete(routine)
            await db.commit()
            logger.info(f"Rutina eliminada: {routine.name} (ID: {routine_id})")
            return True
        return False

    async def execute_routine(self, db: AsyncSession, routine_id: int) -> Optional[List[str]]:
        routine = await self.get_routine_by_id(db, routine_id)
        if not routine or not routine.confirmed or not routine.enabled:
            return None

        command_names = [cmd.name for cmd in routine.iot_commands]
        tts_messages: List[str] = []
        mqtt_actions_in_routine: List[str] = []

        if routine.actions:
            for action in routine.actions:
                if not action or not isinstance(action, str):
                    continue
                a = action.strip()
                if a.startswith('tts_speak:'):
                    msg = a.replace('tts_speak:', '', 1).strip()
                    if msg:
                        tts_messages.append(msg)
                elif a.startswith('mqtt_publish:'):
                    mqtt_actions_in_routine.append(a)

        token = None
        try:
            auth_service = AuthService(db)
            token_data = await auth_service.authenticate_user_by_id(routine.user_id)
            token = token_data.get("access_token")
        except Exception as e:
            logger.error(f"Error obteniendo token para usuario {routine.user_id}: {e}")

        if token:
            headers = {"Authorization": f"Bearer {token}"}
            try:
                async with httpx.AsyncClient() as client:
                    for cmd in routine.iot_commands:
                        payload = {"mqtt_topic": cmd.mqtt_topic, "command_payload": cmd.command_payload}
                        try:
                            response = await client.post(
                                "http://localhost:8000/iot/arduino/send_command",
                                json=payload,
                                headers=headers,
                                timeout=10
                            )
                            response.raise_for_status()
                            logger.info(f"Comando enviado: {cmd.name}")
                        except Exception as e:
                            logger.error(f"Error enviando comando {cmd.name}: {e}")
                    # Si no hay comandos IoT asociados pero existen acciones mqtt_publish en 'actions', procesarlas
                    if not routine.iot_commands and mqtt_actions_in_routine:
                        for action in mqtt_actions_in_routine:
                            try:
                                command_part = action.replace('mqtt_publish:', '', 1).strip()
                                if ',' in command_part:
                                    topic, payload_value = command_part.split(',', 1)
                                else:
                                    logger.warning(f"Formato inválido de mqtt_publish en acciones: '{command_part}'")
                                    continue
                                payload = {"mqtt_topic": topic.strip(), "command_payload": payload_value.strip()}
                                response = await client.post(
                                    "http://localhost:8000/iot/arduino/send_command",
                                    json=payload,
                                    headers=headers,
                                    timeout=10
                                )
                                response.raise_for_status()
                                logger.info(f"Comando MQTT por acciones enviado: {topic.strip()} -> {payload_value.strip()}")
                            except Exception as e:
                                logger.error(f"Error enviando acción MQTT desde acciones: {e}")
            except Exception as e:
                logger.error(f"Error inicializando cliente HTTP para ejecutar rutina {routine.id}: {e}")

        # Ejecutar TTS si hay mensajes
        if tts_messages:
            device_api_key = os.getenv("DEVICE_API_KEY")
            if not device_api_key:
                logger.error("DEVICE_API_KEY no configurado; no se pueden ejecutar acciones TTS de rutinas")
            else:
                tts_headers = {"X-Device-API-Key": device_api_key}
                try:
                    async with httpx.AsyncClient() as client:
                        for msg in tts_messages:
                            try:
                                response = await client.post(
                                    "http://localhost:8000/tts/tts/generate_audio",
                                    json={"text": msg},
                                    headers=tts_headers,
                                    timeout=30
                                )
                                response.raise_for_status()
                                try:
                                    data = response.json()
                                    paths = data.get("audio_file_paths", []) if isinstance(data, dict) else []
                                except Exception:
                                    paths = []
                                if paths:
                                    for p in paths:
                                        try:
                                            logger.info(f"Reproduciendo audio TTS de rutina {routine.id}: {p}")
                                            success = await asyncio.to_thread(self._play_audio_wav, p)
                                            if success:
                                                logger.info(f"Audio TTS reproducido: {p}")
                                            else:
                                                logger.error(f"Error reproduciendo audio TTS: {p}")
                                        finally:
                                            try:
                                                if os.path.exists(p):
                                                    os.remove(p)
                                                    logger.info(f"Audio temporal eliminado: {p}")
                                            except Exception as e:
                                                logger.error(f"Error eliminando audio temporal {p}: {e}")
                                else:
                                    logger.info(f"TTS ejecutado para rutina {routine.id}: '{msg}'")
                            except Exception as e:
                                logger.error(f"Error ejecutando TTS para rutina {routine.id}: {e}")
                except Exception as e:
                    logger.error(f"Error inicializando cliente HTTP para TTS en rutina {routine.id}: {e}")

        routine.last_executed = datetime.now()
        routine.execution_count += 1
        await db.commit()
        logger.info(f"Rutina ejecutada: {routine.name}")
        return command_names

    def _play_audio_wav(self, file_path: str) -> bool:
        if not os.path.exists(file_path):
            logger.error(f"Archivo de audio no encontrado: {file_path}")
            return False
        p = None
        stream = None
        wf = None
        try:
            wf = wave.open(file_path, 'rb')
            p = pyaudio.PyAudio()
            if wf.getsampwidth() not in [1, 2, 4]:
                logger.error(f"Formato de audio inválido en {file_path}")
                return False
            stream = p.open(
                format=p.get_format_from_width(wf.getsampwidth()),
                channels=wf.getnchannels(),
                rate=wf.getframerate(),
                output=True
            )
            chunk_size = 1024
            data = wf.readframes(chunk_size)
            while len(data) > 0:
                stream.write(data)
                data = wf.readframes(chunk_size)
            return True
        except Exception as e:
            logger.error(f"Error al reproducir audio {file_path}: {e}")
            return False
        finally:
            if stream is not None:
                try:
                    stream.stop_stream()
                    stream.close()
                except Exception:
                    pass
            if p is not None:
                try:
                    p.terminate()
                except Exception:
                    pass
            if wf is not None:
                try:
                    wf.close()
                except Exception:
                    pass

    async def check_routine_triggers(
        self, 
        db: AsyncSession, 
        user_id: int, 
        current_context: Dict[str, Any]
    ) -> List[str]:
        actions_to_execute = []
        user_routines = await self.get_user_routines(db, user_id, confirmed_only=True, enabled_only=True)

        for routine in user_routines:
            if self._trigger_matches(routine.trigger, current_context):
                # Aquí, en lugar de ejecutar la rutina directamente, obtenemos las acciones
                # y las extendemos a la lista para que routine_handler las procese.
                # La ejecución real de TTS y MQTT se maneja en routine_handler.execute_automatic_routines
                if routine.actions:
                    actions_to_execute.extend(routine.actions)

        return actions_to_execute

    def _trigger_matches(self, trigger: Dict[str, Any], context: Dict[str, Any]) -> bool:
        trigger_type = trigger.get("type", "").lower()

        if trigger_type in ("time_based", "relative_time_based"):
            now = datetime.now()
            trigger_hour = trigger.get("hour")
            try:
                hour_match = False
                if isinstance(trigger_hour, str):
                    parts = trigger_hour.split(":")
                    if len(parts) == 2:
                        h = int(parts[0])
                        m = int(parts[1])
                        hour_match = (h == now.hour and m == now.minute)
                    else:
                        hour_match = (int(trigger_hour) == now.hour)
                elif isinstance(trigger_hour, int):
                    hour_match = (trigger_hour == now.hour)
                else:
                    hour_match = False

                if not hour_match:
                    return False

                days = trigger.get("days") or []
                date_str = trigger.get("date")

                if date_str:
                    try:
                        # Formato esperado YYYY-MM-DD
                        y, mo, d = [int(x) for x in str(date_str).split("-")]
                        return (now.year == y and now.month == mo and now.day == d)
                    except Exception:
                        return False

                if isinstance(days, list) and len(days) > 0:
                    weekday_map = [
                        "Lunes",
                        "Martes",
                        "Miércoles",
                        "Jueves",
                        "Viernes",
                        "Sábado",
                        "Domingo",
                    ]
                    today_label = weekday_map[now.weekday()]
                    return today_label in days

                return True
            except Exception:
                return False
        elif trigger_type == "context_based":
            return (
                context.get("location") == trigger.get("location") and
                context.get("device_type") == trigger.get("device_type")
            )
        elif trigger_type == "event_based":
            return context.get("intent") == trigger.get("intent")

        return False

    def _generate_routine_name(self, pattern: Dict[str, Any]) -> str:
        pattern_type = pattern.get("type", "").lower()

        if pattern_type == "time_based":
            hour = pattern.get("hour", 0)
            intent = pattern.get("intent", "acción")
            days = pattern.get("days") or []
            date = pattern.get("date")
            when = f"a las {hour}" if isinstance(hour, str) else f"a las {hour}:00"
            if date:
                when += f" el {date}"
            elif isinstance(days, list) and len(days) > 0:
                when += f" ({', '.join(days)})"
            return f"Rutina: {intent} {when}"
        elif pattern_type == "context_based":
            location = pattern.get("location", "ubicación")
            action = pattern.get("action", "acción")
            return f"Rutina: {action} en {location}"
        elif pattern_type == "event_based":
            sequence = " → ".join(pattern.get("sequence", ["acción"]))
            return f"Rutina: {sequence}"

        return "Rutina automática"
        