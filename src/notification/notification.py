import logging
import json
from datetime import datetime
from typing import Optional, List

from fastapi import Depends, Query, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from src.db.database import get_db, get_async_db
from src.db.models import Notification, User
from src.auth.auth_service import get_current_user
from src.api.notifications_schemas import NotificationCreate, NotificationUpdate, NotificationResponse, NotificationsListResponse

logger = logging.getLogger("NotificationsModule")

# --- Service Logic ---
async def log_user_action_dependency(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
) -> None:
    """Dependencia que registra una notificación por cada acción del usuario autenticado.

    Guarda: método, path, user_id, username y (opcionalmente) el body como mensaje.
    """
    try:
        path = request.url.path
        method = request.method

        message: Optional[str] = None
        try:
            body_bytes = await request.body()
            if body_bytes: # Solo intentar decodificar si hay contenido
                message = body_bytes.decode(errors="ignore")
        except Exception:
            # Si no se puede leer el body (por streaming o multipart), continuar sin él
            pass

        notif = Notification(
            timestamp=datetime.now(),
            type="user_action",
            title=f"{method} {path}",
            message=message or "",
            status="new", # Default status as per user request
        )
        db.add(notif)
        await db.commit()
    except Exception as e:
        # No romper el flujo del endpoint por errores de logging
        logger.error(f"Error registrando acción de usuario en notificaciones: {e}")
        try:
            await db.rollback()
        except Exception:
            pass

async def get_notifications_logic(
    db: AsyncSession,
    type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    since: Optional[str] = None
) -> NotificationsListResponse:
    """Devuelve la lista de notificaciones, con filtros opcionales."""
    try:
        query = select(Notification)

        if type:
            query = query.where(Notification.type == type)

        if since:
            try:
                since_dt = datetime.fromisoformat(since)
                query = query.where(Notification.timestamp >= since_dt)
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de fecha 'since' inválido. Use ISO 8601.")

        total_query = select(Notification)
        if type:
            total_query = total_query.where(Notification.type == type)
        if since:
            try:
                since_dt = datetime.fromisoformat(since)
                total_query = total_query.where(Notification.timestamp >= since_dt)
            except ValueError:
                pass # Already handled above

        total_result = await db.execute(total_query)
        total_count = len(total_result.scalars().all()) # This is inefficient for large tables, but works for now.

        query = query.order_by(Notification.timestamp.desc()).offset(offset).limit(limit)

        result = await db.execute(query)
        items: List[Notification] = result.scalars().all()

        return NotificationsListResponse(
            notifications=[
                NotificationResponse(
                    id=n.id,
                    timestamp=n.timestamp,
                    type=n.type,
                    title=n.title,
                    message=n.message,
                    status=n.status,
                ) for n in items
            ],
            total=total_count,
            limit=limit,
            offset=offset
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener notificaciones: {e}")
        raise HTTPException(status_code=500, detail="Error interno al obtener notificaciones")

async def get_notification_types_logic(db: AsyncSession) -> List[str]:
    """Devuelve la lista de tipos de notificaciones disponibles."""
    try:
        result = await db.execute(select(Notification.type).distinct())
        types = [row[0] for row in result.all()]
        return types
    except Exception as e:
        logger.error(f"Error al obtener tipos de notificación: {e}")
        raise HTTPException(status_code=500, detail="Error interno al obtener tipos")

async def create_notification_logic(
    db: AsyncSession,
    notification_data: NotificationCreate
) -> NotificationResponse:
    """Crea una nueva notificación."""
    try:
        new_notification = Notification(
            timestamp=datetime.now(),
            type=notification_data.type,
            title=notification_data.title,
            message=notification_data.message,
            status=notification_data.status
        )
        db.add(new_notification)
        await db.commit()
        await db.refresh(new_notification)
        return NotificationResponse(
            id=new_notification.id,
            timestamp=new_notification.timestamp,
            type=new_notification.type,
            title=new_notification.title,
            message=new_notification.message,
            status=new_notification.status
        )
    except Exception as e:
        logger.error(f"Error al crear notificación: {e}")
        raise HTTPException(status_code=500, detail="Error interno al crear notificación")

async def update_notification_logic(
    db: AsyncSession,
    notification_id: int,
    notification_data: NotificationUpdate
) -> NotificationResponse:
    """Actualiza una notificación existente."""
    try:
        result = await db.execute(select(Notification).where(Notification.id == notification_id))
        notification = result.scalars().first()

        if not notification:
            raise HTTPException(status_code=404, detail="Notificación no encontrada")

        if notification_data.type is not None:
            notification.type = notification_data.type
        if notification_data.title is not None:
            notification.title = notification_data.title
        if notification_data.message is not None:
            notification.message = notification_data.message
        if notification_data.status is not None:
            notification.status = notification_data.status

        await db.commit()
        await db.refresh(notification)
        return NotificationResponse(
            id=notification.id,
            timestamp=notification.timestamp,
            type=notification.type,
            title=notification.title,
            message=notification.message,
            status=notification.status
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar notificación: {e}")
        raise HTTPException(status_code=500, detail="Error interno al actualizar notificación")

async def delete_notification_logic(
    db: AsyncSession,
    notification_id: int
) -> None:
    """Elimina una notificación."""
    try:
        result = await db.execute(select(Notification).where(Notification.id == notification_id))
        notification = result.scalars().first()

        if not notification:
            raise HTTPException(status_code=404, detail="Notificación no encontrada")

        await db.delete(notification)
        await db.commit()
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar notificación: {e}")
        raise HTTPException(status_code=500, detail="Error interno al eliminar notificación")