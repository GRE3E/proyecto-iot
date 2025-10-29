"""
Router de autenticación para el sistema.
"""
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from src.db.database import get_db
from src.auth.jwt_manager import get_current_user
from src.auth.auth_service import AuthService
from .auth_schemas import UserRegister, UserLogin, TokenRefresh

logger = logging.getLogger("Auth")

router = APIRouter(prefix="/auth", tags=["auth"])

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
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            token = await auth_service.authenticate_user(
                username=form_data.username,
                password=form_data.password
            )
        logger.info(f"Usuario {form_data.username} ha iniciado sesión exitosamente")
        return token
    except Exception as e:
        logger.error(f"Error en el inicio de sesión: {e}")
        raise

@router.post("/refresh-token")
async def refresh_token(token_refresh: TokenRefresh):
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            new_tokens = await auth_service.refresh_access_token(token_refresh.refresh_token)
        logger.info("Token de acceso refrescado exitosamente")
        return new_tokens
    except Exception as e:
        logger.error(f"Error al refrescar token: {e}")
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