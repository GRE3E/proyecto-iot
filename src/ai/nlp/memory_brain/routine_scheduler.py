import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.db.database import get_db
from src.db.models import Routine
from .routine_manager import RoutineManager

logger = logging.getLogger("RoutineScheduler")

class RoutineScheduler:

    def __init__(self, routine_manager: RoutineManager):
        self._routine_manager = routine_manager
        self._scheduler_task: Optional[asyncio.Task] = None
        self._is_running = False
        logger.info("RoutineScheduler inicializado")

    async def start(self) -> None:
        if self._is_running:
            logger.warning("RoutineScheduler ya está en ejecución")
            return

        self._is_running = True
        self._scheduler_task = asyncio.create_task(self._scheduling_loop())
        logger.info("RoutineScheduler iniciado")

    async def stop(self) -> None:
        if self._scheduler_task:
            self._scheduler_task.cancel()
            try:
                await self._scheduler_task
            except asyncio.CancelledError:
                logger.info("RoutineScheduler detenido")
            self._scheduler_task = None
        self._is_running = False

    async def _scheduling_loop(self) -> None:
        while self._is_running:
            now = datetime.now()
            logger.debug(f"Verificando rutinas a las {now.strftime('%H:%M:%S')}")

            try:
                async with get_db() as db:
                    result = await db.execute(
                        select(Routine)
                        .options(selectinload(Routine.iot_commands))
                        .filter(
                            Routine.confirmed,
                            Routine.enabled
                        )
                    )
                    all_routines = result.scalars().all()
                    
                    for routine in all_routines:
                        if self._check_trigger(routine, now):
                            logger.info(f"Disparando rutina: {routine.name} (ID: {routine.id})")
                            await self._routine_manager.execute_routine(db, routine.id)
                            
            except Exception as e:
                logger.error(f"Error en el bucle de programación: {e}")

            await asyncio.sleep(self._time_to_next_minute(now))

    def _check_trigger(self, routine: Routine, now: datetime) -> bool:
        trigger = routine.trigger
        trigger_type = trigger.get("type", "").lower()

        if trigger_type == "time_based":
            trigger_hour = trigger.get("hour")
            if trigger_hour is not None:
                try:
                    if isinstance(trigger_hour, str):
                        trigger_time = datetime.strptime(trigger_hour, "%H:%M").time()
                    else:
                        trigger_time = datetime.strptime(f"{trigger_hour}:00", "%H:%M").time()
                    
                    if (trigger_time.hour == now.hour and trigger_time.minute == now.minute):
                        if routine.last_executed and \
                           routine.last_executed.hour == now.hour and \
                           routine.last_executed.minute == now.minute:
                            return False
                        return True
                        
                except (ValueError, TypeError) as e:
                    logger.error(f"Formato de hora inválido en rutina {routine.id}: {trigger_hour} - {e}")
                    return False
        
        return False

    def _time_to_next_minute(self, now: datetime) -> float:
        next_minute = (now + timedelta(minutes=1)).replace(second=0, microsecond=0)
        return (next_minute - now).total_seconds()
        