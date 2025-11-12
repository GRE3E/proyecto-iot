import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field

logger = logging.getLogger("RoutineManager")

@dataclass
class Routine:
    """Rutina aprendida o creada manualmente"""
    routine_id: str
    user_id: int
    name: str
    trigger: Dict[str, Any]
    actions: List[str]
    trigger_type: str
    confirmed: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    last_executed: Optional[datetime] = None
    execution_count: int = 0
    confidence: float = 0.0

    def to_dict(self):
        return {
            "routine_id": self.routine_id,
            "user_id": self.user_id,
            "name": self.name,
            "trigger": self.trigger,
            "actions": self.actions,
            "trigger_type": self.trigger_type,
            "confirmed": self.confirmed,
            "created_at": self.created_at.isoformat(),
            "last_executed": self.last_executed.isoformat() if self.last_executed else None,
            "execution_count": self.execution_count,
            "confidence": self.confidence
        }

class RoutineManager:
    """Gestiona rutinas aprendidas o creadas manualmente"""

    def __init__(self, memory_dir: Path):
        self.memory_dir = memory_dir
        self.memory_dir.mkdir(parents=True, exist_ok=True)
        self.routines_file = self.memory_dir / "routines.json"
        self.routines: Dict[str, Routine] = self._load_routines()

    def _load_routines(self) -> Dict[str, Routine]:
        """Carga rutinas desde almacenamiento"""
        if not self.routines_file.exists():
            return {}
        try:
            with open(self.routines_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                routines = {}
                for routine_id, r in data.items():
                    routines[routine_id] = Routine(
                        routine_id=r["routine_id"],
                        user_id=r["user_id"],
                        name=r["name"],
                        trigger=r["trigger"],
                        actions=r["actions"],
                        trigger_type=r["trigger_type"],
                        confirmed=r.get("confirmed", False),
                        created_at=datetime.fromisoformat(r["created_at"]),
                        last_executed=datetime.fromisoformat(r["last_executed"]) if r.get("last_executed") else None,
                        execution_count=r.get("execution_count", 0),
                        confidence=r.get("confidence", 0.0)
                    )
                return routines
        except Exception as e:
            logger.error(f"Error cargando rutinas: {e}")
            return {}

    def _save_routines(self) -> None:
        """Persiste rutinas en almacenamiento"""
        try:
            with open(self.routines_file, "w", encoding="utf-8") as f:
                json.dump(
                    {rid: r.to_dict() for rid, r in self.routines.items()},
                    f,
                    ensure_ascii=False,
                    indent=2
                )
        except Exception as e:
            logger.error(f"Error guardando rutinas: {e}")

    def create_routine_from_pattern(self, user_id: int, pattern: Dict[str, Any], actions: List[str], confirmed: bool = False) -> Routine:
        """Crea una rutina a partir de un patrón detectado"""
        routine_id = f"r_{user_id}_{int(datetime.now().timestamp())}"
        routine_name = self._generate_routine_name(pattern)
        trigger_type = pattern["type"]

        routine = Routine(
            routine_id=routine_id,
            user_id=user_id,
            name=routine_name,
            trigger=pattern,
            actions=actions,
            trigger_type=trigger_type,
            confirmed=confirmed,
            confidence=pattern.get("confidence", 0.0)
        )

        self.routines[routine_id] = routine
        self._save_routines()
        logger.info(f"Rutina creada: {routine_name}")
        return routine

    def confirm_routine(self, routine_id: str) -> Optional[Routine]:
        """Confirma una rutina propuesta"""
        if routine_id in self.routines:
            self.routines[routine_id].confirmed = True
            self._save_routines()
            logger.info(f"Rutina confirmada: {routine_id}")
            return self.routines[routine_id]
        return None

    def reject_routine(self, routine_id: str) -> bool:
        """Rechaza y elimina una rutina"""
        if routine_id in self.routines:
            del self.routines[routine_id]
            self._save_routines()
            logger.info(f"Rutina rechazada: {routine_id}")
            return True
        return False

    def execute_routine(self, routine_id: str) -> Optional[List[str]]:
        """Ejecuta una rutina confirmada"""
        if routine_id not in self.routines:
            return None

        routine = self.routines[routine_id]
        if not routine.confirmed:
            return None

        routine.last_executed = datetime.now()
        routine.execution_count += 1
        self._save_routines()

        logger.info(f"Rutina ejecutada: {routine.name}")
        return routine.actions

    def get_user_routines(self, user_id: int, confirmed_only: bool = False) -> List[Routine]:
        """Obtiene rutinas de un usuario"""
        routines = [r for r in self.routines.values() if r.user_id == user_id]
        if confirmed_only:
            routines = [r for r in routines if r.confirmed]
        return routines

    def check_routine_triggers(self, user_id: int, current_context: Dict[str, Any]) -> List[str]:
        """Verifica qué rutinas deben ejecutarse según el contexto actual"""
        actions_to_execute = []
        user_routines = self.get_user_routines(user_id, confirmed_only=True)

        for routine in user_routines:
            if self._trigger_matches(routine.trigger, current_context):
                actions = self.execute_routine(routine.routine_id)
                if actions:
                    actions_to_execute.extend(actions)

        return actions_to_execute

    def _trigger_matches(self, trigger: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Verifica si un disparador coincide con el contexto actual"""
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
        """Genera un nombre legible para una rutina"""
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