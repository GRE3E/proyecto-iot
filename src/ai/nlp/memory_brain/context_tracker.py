import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from src.db.models import ContextEvent

logger = logging.getLogger("ContextTracker")

class ContextTracker:

    def __init__(self):
        pass

    async def track_event(
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
        db.add(event)
        await db.commit()
        await db.refresh(event)
        logger.debug(f"Evento registrado en DB: {user_name} - {intent}")

    async def get_user_events(self, db: AsyncSession, user_id: int, limit: int = 100) -> List[ContextEvent]:
        result = await db.execute(
            select(ContextEvent)
            .filter(ContextEvent.user_id == user_id)
            .order_by(ContextEvent.timestamp.desc())
            .limit(limit)
        )
        return list(reversed(result.scalars().all()))

    async def get_events_by_intent(self, db: AsyncSession, user_id: int, intent: str) -> List[ContextEvent]:
        result = await db.execute(
            select(ContextEvent)
            .filter(ContextEvent.user_id == user_id, ContextEvent.intent == intent)
            .order_by(ContextEvent.timestamp.asc())
        )
        return result.scalars().all()

    async def delete_user_events(self, db: AsyncSession, user_id: int) -> int:
        result = await db.execute(
            delete(ContextEvent).filter(ContextEvent.user_id == user_id)
        )
        await db.commit()
        logger.info(f"Eventos eliminados de DB para usuario {user_id}: {result.rowcount}")
        return result.rowcount
