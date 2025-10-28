from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from ..db.database import get_db
from ..db import models
from ..api import permissions_schemas
import logging
from sqlalchemy import select

logger = logging.getLogger("APIRoutes")
router = APIRouter()

@router.post("/permissions/", response_model=permissions_schemas.Permission, status_code=status.HTTP_201_CREATED)
async def create_permission(permission: permissions_schemas.PermissionCreate, db: AsyncSession = Depends(get_db)):
    try:
        db_permission = models.Permission(name=permission.name)
        db.add(db_permission)
        await db.commit()
        await db.refresh(db_permission)
        logger.info(f"Permiso '{permission.name}' creado exitosamente para /permissions/.")
        return db_permission
    except Exception as e:
        logger.error(f"Error al crear permiso '{permission.name}' para /permissions/: {e}")
        raise HTTPException(status_code=500, detail=f"Error al crear permiso: {e}")

@router.get("/permissions/", response_model=List[permissions_schemas.Permission])
async def get_permissions(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(models.Permission).offset(skip).limit(limit))
        permissions = result.scalars().all()
        logger.info(f"Permisos obtenidos exitosamente para /permissions/. Cantidad: {len(permissions)}")
        return permissions
    except Exception as e:
        logger.error(f"Error al obtener permisos para /permissions/: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener permisos: {e}")

@router.post("/users/{user_id}/permissions/", response_model=permissions_schemas.UserPermission, status_code=status.HTTP_201_CREATED)
async def assign_permission_to_user(user_id: int, permission_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result_user = await db.execute(select(models.User).filter(models.User.id == user_id))
        db_user = result_user.scalars().first()
        if not db_user:
            logger.warning(f"Usuario con ID {user_id} no encontrado para /users/{{user_id}}/permissions/.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

        result_permission = await db.execute(select(models.Permission).filter(models.Permission.id == permission_id))
        db_permission = result_permission.scalars().first()
        if not db_permission:
            logger.warning(f"Permiso con ID {permission_id} no encontrado para /users/{{user_id}}/permissions/.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permiso no encontrado")

        result_user_permission = await db.execute(select(models.UserPermission).filter(
            models.UserPermission.user_id == user_id,
            models.UserPermission.permission_id == permission_id
        ))
        db_user_permission = result_user_permission.scalars().first()
        if db_user_permission:
            logger.warning(f"Permiso con ID {permission_id} ya asignado al usuario con ID {user_id} para /users/{{user_id}}/permissions/.")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Permiso ya asignado al usuario")

        user_permission = models.UserPermission(user_id=user_id, permission_id=permission_id)
        db.add(user_permission)
        await db.commit()
        await db.refresh(user_permission)
        logger.info(f"Permiso con ID {permission_id} asignado exitosamente al usuario con ID {user_id} para /users/{{user_id}}/permissions/.")
        return user_permission
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al asignar permiso con ID {permission_id} al usuario con ID {user_id} para /users/{{user_id}}/permissions/: {e}")
        raise HTTPException(status_code=500, detail=f"Error al asignar permiso: {e}")

@router.get("/users/{user_id}/permissions/check/{permission_name}", response_model=bool)
async def check_user_permission(user_id: int, permission_name: str, db: AsyncSession = Depends(get_db)):
    try:
        result_user = await db.execute(select(models.User).filter(models.User.id == user_id))
        db_user = result_user.scalars().first()
        if not db_user:
            logger.warning(f"Usuario con ID {user_id} no encontrado para /users/{{user_id}}/permissions/check/{{permission_name}}.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
        
        has_perm = await db_user.has_permission(permission_name) # Assuming has_permission is async or can be awaited
        logger.info(f"Comprobación de permiso '{permission_name}' para el usuario con ID {user_id} resultó en {has_perm} para /users/{{user_id}}/permissions/check/{{permission_name}}.")
        return has_perm
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al comprobar permiso '{permission_name}' para el usuario con ID {user_id} para /users/{{user_id}}/permissions/check/{{permission_name}}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al comprobar permiso: {e}")

@router.delete("/users/{user_id}/permissions/", status_code=status.HTTP_204_NO_CONTENT)
async def remove_permission_from_user(user_id: int, permission_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result_user_permission = await db.execute(select(models.UserPermission).filter(
            models.UserPermission.user_id == user_id,
            models.UserPermission.permission_id == permission_id
        ))
        db_user_permission = result_user_permission.scalars().first()
        if not db_user_permission:
            logger.warning(f"Permiso de usuario con ID {permission_id} para el usuario {user_id} no encontrado para /users/{{user_id}}/permissions/.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permiso de usuario no encontrado")

        await db.delete(db_user_permission)
        await db.commit()
        logger.info(f"Permiso con ID {permission_id} eliminado exitosamente del usuario con ID {user_id} para /users/{{user_id}}/permissions/.")
        return {"message": "Permiso eliminado exitosamente"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al eliminar permiso con ID {permission_id} del usuario con ID {user_id} para /users/{{user_id}}/permissions/: {e}")
        raise HTTPException(status_code=500, detail=f"Error al eliminar permiso: {e}")
        