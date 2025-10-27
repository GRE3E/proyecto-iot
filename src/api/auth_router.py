"""
Router de autenticación para el sistema.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from src.db.database import get_db
from src.auth.jwt_manager import get_current_user
from src.auth.auth_service import AuthService
from .auth_schemas import UserRegister, UserLogin

logger = logging.getLogger("Auth")

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister):
    """
    Registra un nuevo usuario en el sistema.
    """
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            await auth_service.register_user(
                username=user.username,
                password=user.password,
                is_owner=user.is_owner
            )
        logger.info(f"Usuario {user.username} registrado exitosamente")
        return {"message": f"Usuario {user.username} registrado exitosamente"}
    except Exception as e:
        logger.error(f"Error al registrar usuario: {e}")
        raise

@router.post("/login")
async def login(user: UserLogin):
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            token = await auth_service.authenticate_user(
                username=user.username,
                password=user.password
            )
        logger.info(f"Usuario {user.username} ha iniciado sesión exitosamente")
        return result
    except Exception as e:
        logger.error(f"Error en el inicio de sesión: {e}")
        raise

@router.get("/me")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Obtiene el perfil del usuario autenticado.
    """
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            return {
                "user": await auth_service.get_user_profile(current_user["user_id"])
            }
    except Exception as e:
        logger.error(f"Error al obtener perfil de usuario: {e}")
        raise