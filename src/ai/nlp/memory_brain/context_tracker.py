import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger("ContextTracker")

@dataclass
class ContextEvent:
    """Evento de contexto capturado"""
    user_id: int
    user_name: str
    timestamp: datetime
    intent: str
    action: str
    context: Dict[str, Any]
    device_type: Optional[str] = None
    location: Optional[str] = None
    success: bool = True

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "user_name": self.user_name,
            "timestamp": self.timestamp.isoformat(),
            "intent": self.intent,
            "action": self.action,
            "context": self.context,
            "device_type": self.device_type,
            "location": self.location,
            "success": self.success
        }

class ContextTracker:
    """Captura y registra eventos de contexto del usuario"""

    def __init__(self, memory_dir: Path):
        self.memory_dir = memory_dir
        self.memory_dir.mkdir(parents=True, exist_ok=True)
        self.events_file = self.memory_dir / "context_events.json"
        self.events: List[ContextEvent] = self._load_events()

    def _load_events(self) -> List[ContextEvent]:
        """Carga eventos desde almacenamiento"""
        if not self.events_file.exists():
            return []
        try:
            with open(self.events_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [
                    ContextEvent(
                        user_id=e["user_id"],
                        user_name=e["user_name"],
                        timestamp=datetime.fromisoformat(e["timestamp"]),
                        intent=e["intent"],
                        action=e["action"],
                        context=e["context"],
                        device_type=e.get("device_type"),
                        location=e.get("location"),
                        success=e.get("success", True)
                    )
                    for e in data
                ]
        except Exception as e:
            logger.error(f"Error cargando eventos: {e}")
            return []

    def track_event(
        self,
        user_id: int,
        user_name: str,
        intent: str,
        action: str,
        context: Dict[str, Any],
        device_type: Optional[str] = None,
        location: Optional[str] = None
    ) -> None:
        """Registra un nuevo evento de contexto"""
        event = ContextEvent(
            user_id=user_id,
            user_name=user_name,
            timestamp=datetime.now(),
            intent=intent,
            action=action,
            context=context,
            device_type=device_type,
            location=location
        )
        self.events.append(event)
        self._save_events()
        logger.debug(f"Evento registrado: {user_name} - {intent}")

    def _save_events(self) -> None:
        """Persiste eventos en almacenamiento (últimos 1000)"""
        try:
            with open(self.events_file, "w", encoding="utf-8") as f:
                json.dump(
                    [e.to_dict() for e in self.events[-1000:]],
                    f,
                    ensure_ascii=False,
                    indent=2
                )
        except Exception as e:
            logger.error(f"Error guardando eventos: {e}")

    def get_user_events(self, user_id: int, limit: int = 100) -> List[ContextEvent]:
        """Obtiene eventos de un usuario específico"""
        return [e for e in self.events if e.user_id == user_id][-limit:]

    def get_events_by_intent(self, user_id: int, intent: str) -> List[ContextEvent]:
        """Obtiene eventos por intención específica"""
        return [e for e in self.events if e.user_id == user_id and e.intent == intent]

    def delete_user_events(self, user_id: int) -> int:
        """Elimina todos los eventos de un usuario"""
        original_count = len(self.events)
        self.events = [e for e in self.events if e.user_id != user_id]
        self._save_events()
        deleted = original_count - len(self.events)
        logger.info(f"Eventos eliminados para usuario {user_id}: {deleted}")
        return deleted
        