import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from src.ai.nlp.memory_brain.routine_manager import RoutineManager, Routine
from src.ai.nlp.iot_command_processor import IoTCommandProcessor
from src.db.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("RoutineScheduler")

class RoutineScheduler:
    """
    Programa y ejecuta rutinas automáticas basadas en el tiempo.
    """
    def __init__(self, routine_manager: RoutineManager, iot_processor: IoTCommandProcessor):
        self._routine_manager = routine_manager
        self._iot_processor = iot_processor
        self._scheduler_task: Optional[asyncio.Task] = None
        self._is_running = False
        logger.info("RoutineScheduler inicializado.")

    async def start(self):
        """Inicia el bucle de programación de rutinas."""
        if self._is_running:
            logger.warning("RoutineScheduler ya está en ejecución.")
            return

        self._is_running = True
        self._scheduler_task = asyncio.create_task(self._scheduling_loop())
        logger.info("RoutineScheduler iniciado.")

    async def stop(self):
        """Detiene el bucle de programación de rutinas."""
        if self._scheduler_task:
            self._scheduler_task.cancel()
            try:
                await self._scheduler_task
            except asyncio.CancelledError:
                logger.info("RoutineScheduler detenido.")
            self._scheduler_task = None
        self._is_running = False

    async def _scheduling_loop(self):
        """Bucle principal para verificar y ejecutar rutinas."""
        while self._is_running:
            now = datetime.now()
            logger.debug(f"Verificando rutinas a las {now.strftime('%H:%M:%S')}")

            try:
                async with get_db() as db:
                    # Obtener todas las rutinas confirmadas
                    all_routines = [r for r in self._routine_manager.routines.values() if r.confirmed]
                    
                    for routine in all_routines:
                        if self._check_trigger(routine, now):
                            logger.info(f"Disparando rutina: {routine.name} (ID: {routine.routine_id})")
                            await self._execute_routine_actions(db, routine)
            except Exception as e:
                logger.error(f"Error en el bucle de programación de rutinas: {e}")

            # Esperar hasta el próximo minuto para evitar verificaciones constantes
            await asyncio.sleep(self._time_to_next_minute(now))

    def _check_trigger(self, routine: Routine, now: datetime) -> bool:
        """Verifica si el disparador de una rutina coincide con la hora actual."""
        trigger = routine.trigger
        trigger_type = trigger.get("type")

        if trigger_type == "time_based":
            trigger_hour_str = trigger.get("hour")
            if trigger_hour_str is not None:
                try:
                    trigger_time = datetime.strptime(trigger_hour_str, "%H:%M").time()
                    if trigger_time.hour == now.hour and trigger_time.minute == now.minute:
                        # Evitar ejecutar la misma rutina varias veces en el mismo minuto
                        if routine.last_executed and \
                           routine.last_executed.hour == now.hour and \
                           routine.last_executed.minute == now.minute:
                            return False
                        return True
                except ValueError:
                    logger.error(f"Formato de hora de disparador inválido: {trigger_hour_str}")
        # Otros tipos de disparadores (context_based, event_based) se manejarán de otra forma o en otro lugar
        return False

    async def _execute_routine_actions(self, db: AsyncSession, routine: Routine):
        """Ejecuta las acciones asociadas a una rutina."""
        actions = self._routine_manager.execute_routine(routine.routine_id)
        if actions:
            for action_str in actions:
                # Asumimos que las acciones son comandos IoT en formato mqtt_publish
                if action_str.startswith("mqtt_publish:"):
                    logger.info(f"Ejecutando acción IoT para rutina {routine.name}: {action_str}")
                    # Aquí necesitamos un token de usuario para el iot_processor.
                    # Para rutinas automáticas, podríamos usar un token de sistema o el token del usuario que creó la rutina.
                    # Por simplicidad, por ahora, pasaremos un token dummy o lo manejaremos en el iot_processor.
                    # TODO: Implementar manejo de token para rutinas automáticas.
                    await self._iot_processor.process_iot_command(db, action_str, "dummy_token", user_id=routine.user_id)
                else:
                    logger.warning(f"Acción no reconocida para rutina {routine.name}: {action_str}")

    def _time_to_next_minute(self, now: datetime) -> float:
        """Calcula el tiempo en segundos hasta el inicio del próximo minuto."""
        next_minute = (now + timedelta(minutes=1)).replace(second=0, microsecond=0)
        return (next_minute - now).total_seconds()

    def get_scheduled_routines_info(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Obtiene información sobre las rutinas programadas, opcionalmente filtradas por usuario.
        """
        routines = [r for r in self._routine_manager.routines.values() if r.confirmed]
        if user_id is not None:
            routines = [r for r in routines if r.user_id == user_id]

        scheduled_info = []
        for routine in routines:
            if routine.trigger.get("type") == "time_based":
                scheduled_info.append({
                    "name": routine.name,
                    "trigger_type": routine.trigger.get("type"),
                    "hour": routine.trigger.get("hour"),
                    "actions": routine.actions,
                    "last_executed": routine.last_executed.isoformat() if routine.last_executed else "Nunca"
                })
        return {"scheduled_routines": scheduled_info}