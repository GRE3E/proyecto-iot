from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..db.database import get_db
from ..db import models
from ..api import permissions_schemas

router = APIRouter()

@router.post("/permissions/", response_model=permissions_schemas.Permission, status_code=status.HTTP_201_CREATED)
def create_permission(permission: permissions_schemas.PermissionCreate, db: Session = Depends(get_db)):
    db_permission = models.Permission(name=permission.name)
    db.add(db_permission)
    db.commit()
    db.refresh(db_permission)
    return db_permission

@router.get("/permissions/", response_model=List[permissions_schemas.Permission])
def get_permissions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    permissions = db.query(models.Permission).offset(skip).limit(limit).all()
    return permissions

@router.post("/users/{user_id}/permissions/", response_model=permissions_schemas.UserPermission, status_code=status.HTTP_201_CREATED)
def assign_permission_to_user(user_id: int, permission_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    db_permission = db.query(models.Permission).filter(models.Permission.id == permission_id).first()
    if not db_permission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permiso no encontrado")

    db_user_permission = db.query(models.UserPermission).filter(
        models.UserPermission.user_id == user_id,
        models.UserPermission.permission_id == permission_id
    ).first()
    if db_user_permission:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Permiso ya asignado al usuario")

    user_permission = models.UserPermission(user_id=user_id, permission_id=permission_id)
    db.add(user_permission)
    db.commit()
    db.refresh(user_permission)
    return user_permission

@router.get("/users/{user_id}/permissions/check/{permission_name}", response_model=bool)
def check_user_permission(user_id: int, permission_name: str, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    
    return db_user.has_permission(permission_name)

@router.delete("/users/{user_id}/permissions/", status_code=status.HTTP_204_NO_CONTENT)
def remove_permission_from_user(user_id: int, permission_id: int, db: Session = Depends(get_db)):
    db_user_permission = db.query(models.UserPermission).filter(
        models.UserPermission.user_id == user_id,
        models.UserPermission.permission_id == permission_id
    ).first()
    if not db_user_permission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permiso de usuario no encontrado")

    db.delete(db_user_permission)
    db.commit()
    return {"message": "Permiso eliminado exitosamente"}