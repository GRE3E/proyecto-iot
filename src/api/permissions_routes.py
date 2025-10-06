from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..db.database import get_db
from ..db import models
from ..api import permissions_schemas
import logging

logger = logging.getLogger("APIRoutes")

router = APIRouter()

@router.post("/permissions/", response_model=permissions_schemas.Permission, status_code=status.HTTP_201_CREATED)
def create_permission(permission: permissions_schemas.PermissionCreate, db: Session = Depends(get_db)):
    try:
        db_permission = models.Permission(name=permission.name)
        db.add(db_permission)
        db.commit()
        db.refresh(db_permission)
        logger.info(f"Permiso '{permission.name}' creado exitosamente para /permissions/.")
        return db_permission
    except Exception as e:
        logger.error(f"Error al crear permiso '{permission.name}' para /permissions/: {e}")
        raise HTTPException(status_code=500, detail=f"Error al crear permiso: {e}")

@router.get("/permissions/", response_model=List[permissions_schemas.Permission])
def get_permissions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        permissions = db.query(models.Permission).offset(skip).limit(limit).all()
        logger.info(f"Permisos obtenidos exitosamente para /permissions/. Cantidad: {len(permissions)}")
        return permissions
    except Exception as e:
        logger.error(f"Error al obtener permisos para /permissions/: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener permisos: {e}")

@router.post("/users/{user_id}/permissions/", response_model=permissions_schemas.UserPermission, status_code=status.HTTP_201_CREATED)
def assign_permission_to_user(user_id: int, permission_id: int, db: Session = Depends(get_db)):
    try:
        db_user = db.query(models.User).filter(models.User.id == user_id).first()
        if not db_user:
            logger.warning(f"Usuario con ID {user_id} no encontrado para /users/{{user_id}}/permissions/.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

        db_permission = db.query(models.Permission).filter(models.Permission.id == permission_id).first()
        if not db_permission:
            logger.warning(f"Permiso con ID {permission_id} no encontrado para /users/{{user_id}}/permissions/.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permiso no encontrado")

        db_user_permission = db.query(models.UserPermission).filter(
            models.UserPermission.user_id == user_id,
            models.UserPermission.permission_id == permission_id
        ).first()
        if db_user_permission:
            logger.warning(f"Permiso con ID {permission_id} ya asignado al usuario con ID {user_id} para /users/{{user_id}}/permissions/.")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Permiso ya asignado al usuario")

        user_permission = models.UserPermission(user_id=user_id, permission_id=permission_id)
        db.add(user_permission)
        db.commit()
        db.refresh(user_permission)
        logger.info(f"Permiso con ID {permission_id} asignado exitosamente al usuario con ID {user_id} para /users/{{user_id}}/permissions/.")
        return user_permission
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al asignar permiso con ID {permission_id} al usuario con ID {user_id} para /users/{{user_id}}/permissions/: {e}")
        raise HTTPException(status_code=500, detail=f"Error al asignar permiso: {e}")

@router.get("/users/{user_id}/permissions/check/{permission_name}", response_model=bool)
def check_user_permission(user_id: int, permission_name: str, db: Session = Depends(get_db)):
    try:
        db_user = db.query(models.User).filter(models.User.id == user_id).first()
        if not db_user:
            logger.warning(f"Usuario con ID {user_id} no encontrado para /users/{{user_id}}/permissions/check/{{permission_name}}.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
        
        has_perm = db_user.has_permission(permission_name)
        logger.info(f"Comprobación de permiso '{permission_name}' para el usuario con ID {user_id} resultó en {has_perm} para /users/{{user_id}}/permissions/check/{{permission_name}}.")
        return has_perm
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al comprobar permiso '{permission_name}' para el usuario con ID {user_id} para /users/{{user_id}}/permissions/check/{{permission_name}}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al comprobar permiso: {e}")

@router.delete("/users/{user_id}/permissions/", status_code=status.HTTP_204_NO_CONTENT)
def remove_permission_from_user(user_id: int, permission_id: int, db: Session = Depends(get_db)):
    try:
        db_user_permission = db.query(models.UserPermission).filter(
            models.UserPermission.user_id == user_id,
            models.UserPermission.permission_id == permission_id
        ).first()
        if not db_user_permission:
            logger.warning(f"Permiso de usuario con ID {permission_id} para el usuario {user_id} no encontrado para /users/{{user_id}}/permissions/.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permiso de usuario no encontrado")

        db.delete(db_user_permission)
        db.commit()
        logger.info(f"Permiso con ID {permission_id} eliminado exitosamente del usuario con ID {user_id} para /users/{{user_id}}/permissions/.")
        return {"message": "Permiso eliminado exitosamente"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al eliminar permiso con ID {permission_id} del usuario con ID {user_id} para /users/{{user_id}}/permissions/: {e}")
        raise HTTPException(status_code=500, detail=f"Error al eliminar permiso: {e}")