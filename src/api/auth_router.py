from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
import logging
from src.db.database import get_db
from src.auth.jwt_manager import get_current_user
from src.auth.auth_service import AuthService
from src.auth.device_auth import get_device_api_key
from .auth_schemas import UserRegister, TokenRefresh, OwnerRegister
from src.auth.voice_auth_recovery import voice_password_recovery

logger = logging.getLogger("APIRoutes")

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
                password=user.password
            )
        logger.info(f"Usuario {user.username} registrado exitosamente")
        return {"message": f"Usuario {user.username} registrado exitosamente"}
    except Exception as e:
        logger.error(f"Error al registrar usuario: {e}")
        raise

@router.post("/register-owner", status_code=status.HTTP_201_CREATED)
async def register_owner(user: OwnerRegister, api_key: str =  Depends(get_current_user)):
    """
    Registra un nuevo usuario propietario en el sistema (protegido por API Key).
    """
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            await auth_service.register_user(
                username=user.username,
                password=user.password,
                is_owner=user.is_owner
            )
        logger.info(f"Usuario propietario {user.username} registrado exitosamente")
        return {"message": f"Usuario propietario {user.username} registrado exitosamente"}
    except Exception as e:
        logger.error(f"Error al registrar usuario propietario: {e}")
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

@router.get("/owners", response_model=list[str], dependencies=[Depends(get_current_user)])
async def list_owners():
    """Retorna solo los nombres de usuario de los propietarios."""
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            owners_data = await auth_service.get_owner_users()
            usernames = [o["username"] for o in owners_data]
            return usernames
    except Exception as e:
        logger.error(f"Error al listar propietarios: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al listar propietarios")

@router.post("/voice-password-recovery", status_code=status.HTTP_200_OK)
async def voice_password_recovery_endpoint(audio_file: UploadFile = File(...), new_password: str = Form(...)):
    """
    Inicia el proceso de recuperación de contraseña por voz.
    """
    try:
        audio_content = await audio_file.read()
        success = await voice_password_recovery(audio_content, new_password)
        if success:
            logger.info(f"Recuperación de contraseña por voz exitosa.")
            return {"message": "Contraseña actualizada exitosamente."}
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Hablante no identificado o error al actualizar la contraseña.")
    except Exception as e:
        logger.error(f"Error en la recuperación de contraseña por voz: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor.")
    