import logging
from typing import Optional, Dict, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from .context_tracker import ContextTracker
from .pattern_analyzer import PatternAnalyzer
from .routine_manager import RoutineManager
from src.db.models import Routine

logger = logging.getLogger("MemoryBrain")

class MemoryBrain:

    def __init__(self):
        self.context_tracker = ContextTracker()
        self.pattern_analyzer = PatternAnalyzer(self.context_tracker)
        self.routine_manager = RoutineManager()

        logger.info("MemoryBrain inicializado")

    async def track_interaction(
        self,
        db: AsyncSession,
        user_id: int,
        user_name: str,
        intent: str,
        action: str,
        context: Dict[str, Any],
        device_type: Optional[str] = None,
        location: Optional[str] = None
    ) -> None:
        await self.context_tracker.track_event(
            db=db,
            user_id=user_id,
            user_name=user_name,
            intent=intent,
            action=action,
            context=context,
            device_type=device_type,
            location=location
        )

    async def analyze_user(self, db: AsyncSession, user_id: int) -> Dict[str, Any]:
        return await self.pattern_analyzer.detect_all_patterns(db, user_id)

    async def suggest_routines(
        self, 
        db: AsyncSession, 
        user_id: int, 
        min_confidence: float = 0.5
    ) -> List[Routine]:
        patterns = await self.analyze_user(db, user_id)
        suggested_routines = []

        for pattern in patterns.get("time_patterns", []):
            if pattern.get("confidence", 0) >= min_confidence:
                routine = await self.routine_manager.create_routine_from_pattern(
                    db, user_id, pattern, confirmed=False
                )
                suggested_routines.append(routine)

        for pattern in patterns.get("location_patterns", []):
            if pattern.get("confidence", 0) >= min_confidence:
                routine = await self.routine_manager.create_routine_from_pattern(
                    db, user_id, pattern, confirmed=False
                )
                suggested_routines.append(routine)

        return suggested_routines

    async def get_routine_status(self, db: AsyncSession, user_id: int) -> Dict[str, Any]:
        routines = await self.routine_manager.get_user_routines(db, user_id)
        return {
            "total_routines": len(routines),
            "confirmed": len([r for r in routines if r.confirmed]),
            "pending": len([r for r in routines if not r.confirmed]),
            "enabled": len([r for r in routines if r.enabled]),
            "routines": [r.to_dict() for r in routines]
        }
        