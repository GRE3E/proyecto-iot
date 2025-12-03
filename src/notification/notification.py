import logging
from datetime import datetime
from typing import Optional, List
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.db.database import get_async_db
from src.db.models import Notification, User, UserNotification
from src.auth.auth_service import get_current_user
from src.api.notifications_schemas import NotificationCreate, NotificationUpdate, NotificationResponse, NotificationsListResponse
from src.websocket.connection_manager import manager as ws_manager


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

        # Creamos la notificación global
        new_notification = Notification(
            timestamp=datetime.now(),
            type="user_action",
            title=f"{method} {path}",
            message=message or "",
        )
        db.add(new_notification)
        await db.flush() # Para obtener el ID de la notificación antes del commit

        # Creamos la UserNotification para el usuario actual
        user_notification = UserNotification(
            user_id=user.id,
            notification_id=new_notification.id,
            status="new",
        )
        db.add(user_notification)
        await db.commit()
        # Enviar la nueva notificación por WebSocket
        notification_response = NotificationResponse(
            id=new_notification.id,
            timestamp=new_notification.timestamp,
            type=new_notification.type,
            title=new_notification.title,
            message=new_notification.message,
            status=user_notification.status
        )
        await ws_manager.broadcast(notification_response.model_dump_json())
    except Exception as e:
        # No romper el flujo del endpoint por errores de logging
        logger.error(f"Error registrando acción de usuario en notificaciones: {e}")
        try:
            await db.rollback()
        except Exception:
            pass

async def get_notifications_logic(
    db: AsyncSession,
    current_user: User,
    type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    since: Optional[str] = None,
    status: Optional[str] = None # Nuevo filtro por estado de UserNotification
) -> NotificationsListResponse:
    """Devuelve la lista de notificaciones, con filtros opcionales."""
    try:
        # 1. Obtener todas las notificaciones relevantes para el usuario
        # Esto incluye:
        #   a) Notificaciones específicas del usuario (donde existe UserNotification)
        #   b) Notificaciones globales (donde Notification.is_global es True)
        
        # Subconsulta para obtener los IDs de notificaciones específicas del usuario
        user_specific_notification_ids_q = select(UserNotification.notification_id).where(
            UserNotification.user_id == current_user.id
        )
        user_specific_notification_ids = (await db.execute(user_specific_notification_ids_q)).scalars().all()

        # Consulta principal para obtener las notificaciones
        query = select(Notification).outerjoin(
            UserNotification,
            (Notification.id == UserNotification.notification_id) & (UserNotification.user_id == current_user.id)
        ).where(
            (Notification.is_global == True) | (Notification.id.in_(user_specific_notification_ids))
        )

        if type:
            query = query.where(Notification.type == type)
        if since:
            try:
                since_dt = datetime.fromisoformat(since)
                query = query.where(Notification.timestamp >= since_dt)
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de fecha 'since' inválido. Use ISO 8601.")
        
        # Ejecutar la consulta para obtener todas las notificaciones relevantes
        result = await db.execute(query)
        notifications_raw = result.unique().scalars().all() # Usar unique() para evitar duplicados si hay múltiples UserNotifications (aunque no debería pasar con el join)

        combined_notifications = []
        for n in notifications_raw:
            # Intentar obtener el UserNotification para esta notificación y usuario
            user_notification_q = select(UserNotification).where(
                UserNotification.user_id == current_user.id,
                UserNotification.notification_id == n.id
            )
            user_notification = (await db.execute(user_notification_q)).scalars().first()

            current_status = "new"
            if user_notification:
                current_status = user_notification.status
            elif status and status != "new":
                # Si se filtra por un status que no es 'new' y no hay UserNotification,
                # esta notificación no debería incluirse a menos que sea global y se busque 'new'.
                # Ya filtramos por (is_global OR user_specific_notification_ids),
                # así que si llegamos aquí y se busca un status diferente de 'new', la omitimos.
                continue
            
            # Aplicar filtro por status si se especificó
            if status and current_status != status:
                continue

            combined_notifications.append(NotificationResponse(
                id=n.id,
                timestamp=n.timestamp,
                type=n.type,
                title=n.title,
                message=n.message,
                status=current_status,
            ))

        # Ordenar por timestamp descendente
        combined_notifications.sort(key=lambda x: x.timestamp, reverse=True)

        # Calcular total antes de aplicar limit y offset
        total_count = len(combined_notifications)

        # Aplicar limit y offset
        paginated_notifications = combined_notifications[offset : offset + limit]

        return NotificationsListResponse(
            notifications=paginated_notifications,
            total=total_count,
            limit=limit,
            offset=offset
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener notificaciones: {e}")
        raise HTTPException(status_code=500, detail="Error interno al obtener notificaciones")

async def get_notification_types_logic(
    db: AsyncSession,
    current_user: User = Depends(get_current_user) # Añadir current_user para filtrar tipos por usuario
) -> List[str]:
    """Devuelve la lista de tipos de notificaciones disponibles para el usuario actual."""
    try:
        result = await db.execute(
            select(Notification.type)
            .join(UserNotification)
            .where(UserNotification.user_id == current_user.id)
            .distinct()
        )
        types = [row[0] for row in result.all()]
        return types
    except Exception as e:
        logger.error(f"Error al obtener tipos de notificación: {e}")
        raise HTTPException(status_code=500, detail="Error interno al obtener tipos")

async def create_notification_logic(
    db: AsyncSession,
    notification_data: NotificationCreate,
    current_user: User # current_user ya se resuelve en el endpoint
) -> NotificationResponse:
    """Crea una nueva notificación. Si es global, crea UserNotifications para todos los usuarios."""
    try:
        new_notification = Notification(
            timestamp=datetime.now(),
            type=notification_data.type,
            title=notification_data.title,
            message=notification_data.message,
            is_global=notification_data.is_global # Set the is_global flag
        )
        db.add(new_notification)
        await db.flush() # Para obtener el ID de la notificación antes del commit

        if notification_data.is_global:
            # Obtener todos los usuarios
            users_result = await db.execute(select(User))
            all_users = users_result.scalars().all()

            user_notifications_to_add = []
            for user in all_users:
                user_notifications_to_add.append(
                    UserNotification(
                        user_id=user.id,
                        notification_id=new_notification.id,
                        status=notification_data.status or "new"
                    )
                )
            db.add_all(user_notifications_to_add)
        else:
            # Comportamiento actual: solo para el usuario que la crea
            user_notification = UserNotification(
                user_id=current_user.id,
                notification_id=new_notification.id,
                status=notification_data.status or "new"
            )
            db.add(user_notification)
        
        await db.commit()
        await db.refresh(new_notification)

        # Si es global, el status devuelto es el por defecto 'new'
        # Si no es global, se devuelve el status de la UserNotification creada para el usuario
        status_to_return = notification_data.status or "new"
        if not notification_data.is_global:
            # Si no es global, necesitamos refrescar la user_notification para obtener su status real si se modificó
            # Aunque en este punto, el status ya debería ser el que se asignó.
            # Podríamos buscar la user_notification específica para el current_user si fuera necesario.
            pass # No necesitamos refrescar user_notification aquí para el retorno, ya tenemos el status.

        return NotificationResponse(
            id=new_notification.id,
            timestamp=new_notification.timestamp,
            type=new_notification.type,
            title=new_notification.title,
            message=new_notification.message,
            status=status_to_return # Devolver el status adecuado
        )
        # Enviar la nueva notificación por WebSocket
        notification_response = NotificationResponse(
            id=new_notification.id,
            timestamp=new_notification.timestamp,
            type=new_notification.type,
            title=new_notification.title,
            message=new_notification.message,
            status=status_to_return
        )
        await ws_manager.broadcast(notification_response.model_dump_json())
    except Exception as e:
        logger.error(f"Error al crear notificación: {e}")
        raise HTTPException(status_code=500, detail="Error interno al crear notificación")

async def update_notification_logic(
    db: AsyncSession,
    notification_id: int,
    notification_data: NotificationUpdate,
    current_user: User # current_user ya se resuelve en el endpoint
) -> NotificationResponse:
    """Actualiza el estado de una UserNotification existente para el usuario actual."""
    try:
        # Buscar la UserNotification específica para el usuario y la notificación
        result = await db.execute(
            select(UserNotification)
            .where(UserNotification.notification_id == notification_id)
            .where(UserNotification.user_id == current_user.id)
        )
        user_notification = result.scalars().first()

        if not user_notification:
            raise HTTPException(status_code=404, detail="Notificación no encontrada para este usuario")

        # Actualizar solo el status de la UserNotification
        if notification_data.status is not None:
            user_notification.status = notification_data.status
        
        # Opcionalmente, si se quiere actualizar la notificación global (type, title, message)
        # esto debería ser un endpoint separado o manejarse con cuidado.
        # Por ahora, solo actualizamos el status de la UserNotification.

        await db.commit()
        await db.refresh(user_notification)

        # Recuperar la notificación global para la respuesta
        notification_global = (await db.execute(select(Notification).where(Notification.id == notification_id))).scalars().first()
        if not notification_global:
            raise HTTPException(status_code=404, detail="Notificación global no encontrada")

        return NotificationResponse(
            id=notification_global.id,
            timestamp=notification_global.timestamp,
            type=notification_global.type,
            title=notification_global.title,
            message=notification_global.message,
            status=user_notification.status # Devolver el status de UserNotification
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar notificación: {e}")
        raise HTTPException(status_code=500, detail="Error interno al actualizar notificación")

async def update_notification_status_logic(
    db: AsyncSession,
    notification_id: int,
    new_status: str,
    current_user: User
) -> NotificationResponse:
    """Actualiza el estado de una UserNotification específica o crea una si no existe para notificaciones globales."""
    try:
        # Buscar la UserNotification existente para este usuario y notificación
        user_notification_query = select(UserNotification).where(
            UserNotification.user_id == current_user.id,
            UserNotification.notification_id == notification_id
        )
        user_notification = (await db.execute(user_notification_query)).scalars().first()

        if user_notification:
            # Si existe, actualizar su estado
            user_notification.status = new_status
            await db.commit()
            await db.refresh(user_notification)

            # Obtener la notificación original para la respuesta
            notification = (await db.execute(select(Notification).where(Notification.id == notification_id))).scalars().first()
            if not notification:
                raise HTTPException(status_code=404, detail="Notificación no encontrada")

            return NotificationResponse(
                id=notification.id,
                timestamp=notification.timestamp,
                type=notification.type,
                title=notification.title,
                message=notification.message,
                status=user_notification.status
            )
        else:
            # Si no existe UserNotification, verificar si es una notificación global
            notification = (await db.execute(select(Notification).where(Notification.id == notification_id))).scalars().first()
            if not notification:
                raise HTTPException(status_code=404, detail="Notificación no encontrada")

            if notification.is_global:
                # Crear una nueva UserNotification para esta notificación global y usuario
                new_user_notification = UserNotification(
                    user_id=current_user.id,
                    notification_id=notification_id,
                    status=new_status
                )
                db.add(new_user_notification)
                await db.commit()
                await db.refresh(new_user_notification)

                return NotificationResponse(
                    id=notification.id,
                    timestamp=notification.timestamp,
                    type=notification.type,
                    title=notification.title,
                    message=notification.message,
                    status=new_user_notification.status
                )
            else:
                # Si no es global y no hay UserNotification, significa que el usuario no tiene acceso a ella o no debería modificarla
                raise HTTPException(status_code=403, detail="No autorizado para modificar esta notificación")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar el estado de la notificación: {e}")
        raise HTTPException(status_code=500, detail="Error interno al actualizar el estado de la notificación")

async def delete_notification_logic(
    db: AsyncSession,
    notification_id: int,
    current_user: User = Depends(get_current_user) # Añadir current_user
) -> None:
    """Elimina la UserNotification para el usuario actual."""
    try:
        # Buscar la UserNotification específica para el usuario y la notificación
        result = await db.execute(
            select(UserNotification)
            .where(UserNotification.notification_id == notification_id)
            .where(UserNotification.user_id == current_user.id)
        )
        user_notification = result.scalars().first()

        if not user_notification:
            raise HTTPException(status_code=404, detail="Notificación no encontrada para este usuario")

        await db.delete(user_notification)
        await db.commit()
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar notificación: {e}")
        raise HTTPException(status_code=500, detail="Error interno al eliminar notificación")