import logging
from pathlib import Path
from typing import Optional, Dict, List, Any
from .context_tracker import ContextTracker
from .pattern_analyzer import PatternAnalyzer
from .routine_manager import RoutineManager

logger = logging.getLogger("MemoryBrain")


class MemoryBrain:
    """Sistema cognitivo principal que integra contexto, patrones y rutinas"""

    def __init__(self, memory_dir: Optional[Path] = None):
        if memory_dir is None:
            memory_dir = Path(__file__).parent.parent.parent.parent.parent / "data" / "memory_brain"

        self.memory_dir = memory_dir
        self.memory_dir.mkdir(parents=True, exist_ok=True)

        self.context_tracker = ContextTracker(self.memory_dir)
        self.pattern_analyzer = PatternAnalyzer(self.context_tracker)
        self.routine_manager = RoutineManager(self.memory_dir)

        logger.info("MemoryBrain inicializado")

    def track_interaction(
        self,
        user_id: int,
        user_name: str,
        intent: str,
        action: str,
        context: Dict[str, Any],
        device_type: Optional[str] = None,
        location: Optional[str] = None
    ) -> None:
        """Registra una interacción del usuario"""
        self.context_tracker.track_event(
            user_id=user_id,
            user_name=user_name,
            intent=intent,
            action=action,
            context=context,
            device_type=device_type,
            location=location
        )

    def analyze_user(self, user_id: int) -> Dict[str, Any]:
        """Analiza todos los patrones de un usuario"""
        return self.pattern_analyzer.detect_all_patterns(user_id)

    def suggest_routines(self, user_id: int, min_confidence: float = 0.5) -> List[Any]:
        """Sugiere nuevas rutinas basadas en patrones detectados"""
        patterns = self.analyze_user(user_id)
        suggested_routines = []

        for pattern in patterns.get("time_patterns", []):
            if pattern.get("confidence", 0) >= min_confidence:
                routine = self.routine_manager.create_routine_from_pattern(
                    user_id, pattern, []
                )
                suggested_routines.append(routine)

        for pattern in patterns.get("location_patterns", []):
            if pattern.get("confidence", 0) >= min_confidence:
                routine = self.routine_manager.create_routine_from_pattern(
                    user_id, pattern, []
                )
                suggested_routines.append(routine)

        return suggested_routines

    def get_routine_status(self, user_id: int) -> Dict[str, Any]:
        """Obtiene estado de rutinas del usuario"""
        routines = self.routine_manager.get_user_routines(user_id)
        return {
            "total_routines": len(routines),
            "confirmed": len([r for r in routines if r.confirmed]),
            "pending": len([r for r in routines if not r.confirmed]),
            "routines": [r.to_dict() for r in routines]
        }
        