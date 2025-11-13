import logging
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
            confidence=pattern.get("confidence", 0.0)
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

        allowed_fields = ['name', 'description', 'trigger', 'enabled', 'confidence']
        for field, value in kwargs.items():
            if field in allowed_fields:
                setattr(routine, field, value)

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
            except Exception as e:
                logger.error(f"Error inicializando cliente HTTP para ejecutar rutina {routine.id}: {e}")

        routine.last_executed = datetime.now()
        routine.execution_count += 1
        await db.commit()
        logger.info(f"Rutina ejecutada: {routine.name}")
        return command_names

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
                actions = await self.execute_routine(db, routine.id)
                if actions:
                    actions_to_execute.extend(actions)

        return actions_to_execute

    def _trigger_matches(self, trigger: Dict[str, Any], context: Dict[str, Any]) -> bool:
        trigger_type = trigger.get("type", "").lower()

        if trigger_type == "time_based":
            current_hour = datetime.now().hour
            return current_hour == trigger.get("hour")
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
            return f"Rutina: {intent} a las {hour}:00"
        elif pattern_type == "context_based":
            location = pattern.get("location", "ubicación")
            action = pattern.get("action", "acción")
            return f"Rutina: {action} en {location}"
        elif pattern_type == "event_based":
            sequence = " → ".join(pattern.get("sequence", ["acción"]))
            return f"Rutina: {sequence}"

        return "Rutina automática"
        