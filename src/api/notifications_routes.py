from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from src.db.database import get_async_db
from src.db.models import User
from src.auth.auth_service import get_current_user
from src.api.notifications_schemas import NotificationCreate, NotificationUpdate, NotificationResponse, NotificationsListResponse, NotificationStatusUpdate
from src.notification.notification import (
    log_user_action_dependency,
    get_notifications_logic,
    get_notification_types_logic,
    create_notification_logic,
    update_notification_logic,
    delete_notification_logic,
    update_notification_status_logic
)

notifications_router = APIRouter(prefix="/notifications", tags=["notifications"]) # Renamed to avoid conflict

@notifications_router.get("/", response_model=NotificationsListResponse, dependencies=[Depends(get_current_user)])
async def get_notifications(
    db: AsyncSession = Depends(get_async_db),
    type: Optional[str] = Query(default=None, description="Filtrar por tipo de notificación"),
    limit: int = Query(default=50, ge=1, le=500, description="Máximo número de notificaciones"),
    offset: int = Query(default=0, ge=0, description="Número de notificaciones a omitir"),
    since: Optional[str] = Query(default=None, description="ISO datetime para filtrar por fecha mínima"),
    status: Optional[str] = Query(default=None, description="Filtrar por estado de notificación para el usuario (e.g., 'new', 'read', 'archived')"),
    current_user: User = Depends(get_current_user)
):
    """Devuelve la lista de notificaciones, con filtros opcionales."""
    return await get_notifications_logic(db, current_user, type, limit, offset, since, status)

@notifications_router.get("/types", response_model=List[str], dependencies=[Depends(get_current_user)])
async def get_notification_types(db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    """Devuelve la lista de tipos de notificaciones disponibles."""
    return await get_notification_types_logic(db, current_user)

@notifications_router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_user), Depends(log_user_action_dependency)])
async def create_notification(
    notification_data: NotificationCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    """Crea una nueva notificación."""
    return await create_notification_logic(db, notification_data, current_user)

@notifications_router.put("/{notification_id}", response_model=NotificationResponse, dependencies=[Depends(get_current_user)])
async def update_notification(
    notification_id: int,
    notification_data: NotificationUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza una notificación existente."""
    return await update_notification_logic(db, notification_id, notification_data, current_user)

@notifications_router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(get_current_user)])
async def delete_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """Elimina una notificación."""
    return await delete_notification_logic(db, notification_id)

@notifications_router.put("/{notification_id}/status", response_model=NotificationResponse, dependencies=[Depends(get_current_user)])
async def update_notification_status(
    notification_id: int,
    status_update: NotificationStatusUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza el estado de una notificación específica para el usuario actual."""
    return await update_notification_status_logic(db, notification_id, status_update.status, current_user)