from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File, Form, Query
from fastapi.security import OAuth2PasswordRequestForm
import logging
from src.db.database import get_db
from src.auth.auth_service import AuthService, get_current_user
from src.auth.device_auth import get_device_api_key
from src.db.models import User
from .auth_schemas import (
    UserRegister, TokenRefresh, OwnerRegister,
    UpdateUsernameRequest, UpdatePasswordRequest, VerifyPasswordRequest,
    MemberSummary, UserDeleteRequest,
)
from src.auth.voice_auth_recovery import voice_password_recovery
from src.auth.face_auth_recovery import face_password_recovery

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

@router.get("/members", response_model=list[MemberSummary], dependencies=[Depends(get_current_user)])
async def list_members():
    """Retorna usuarios no propietarios (miembros)."""
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            members = await auth_service.get_non_owner_users()
            return members
    except Exception as e:
        logger.error(f"Error al listar miembros: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al listar miembros")

@router.post("/verify-password", dependencies=[Depends(get_current_user)])
async def verify_password(payload: VerifyPasswordRequest, current_user: dict = Depends(get_current_user)):
    """Verifica la contraseña actual del usuario autenticado."""
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            ok = await auth_service.verify_current_password(current_user["user_id"], payload.current_password)
            if not ok:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Contraseña actual incorrecta")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al verificar contraseña: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al verificar contraseña")

@router.post("/update-username", dependencies=[Depends(get_current_user)])
async def update_username(payload: UpdateUsernameRequest, current_user: dict = Depends(get_current_user)):
    """Actualiza el nombre de usuario, requiriendo la contraseña actual."""
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            result = await auth_service.update_username(
                user_id=current_user["user_id"],
                new_username=payload.new_username,
                current_password=payload.current_password,
            )
        logger.info(f"Usuario {current_user['user_id']} actualizó su nombre a {result['username']}")
        return {"message": "Nombre de usuario actualizado", "user": result}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error al actualizar nombre de usuario: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al actualizar nombre de usuario")

@router.post("/update-password", dependencies=[Depends(get_current_user)])
async def update_password(payload: UpdatePasswordRequest, current_user: dict = Depends(get_current_user)):
    """Actualiza la contraseña del usuario, requiriendo la contraseña actual."""
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            result = await auth_service.update_password(
                user_id=current_user["user_id"],
                new_password=payload.new_password,
                current_password=payload.current_password,
            )
        logger.info(f"Usuario {current_user['user_id']} actualizó su contraseña")
        return {"message": "Contraseña actualizada", "user": result}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error al actualizar contraseña: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al actualizar contraseña")

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


@router.post("/face-password-recovery", status_code=status.HTTP_200_OK)
async def face_password_recovery_endpoint(new_password: str = Form(...), source: str = Query("camera", pattern="^(camera|file)$"), image_file: UploadFile = File(None)):
    """
    Inicia el proceso de recuperación de contraseña por reconocimiento facial.
    """
    try:
        if source == "file":
            if not image_file:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Se requiere un archivo de imagen para el reconocimiento por archivo.")
            image_content = await image_file.read()
            success = await face_password_recovery(new_password, source=source, image_content=image_content)
        else:
            success = await face_password_recovery(new_password, source=source)

        if success:
            logger.info(f"Recuperación de contraseña por reconocimiento facial exitosa.")
            return {"message": "Contraseña actualizada exitosamente."}
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Rostro no identificado o error al actualizar la contraseña.")
    except Exception as e:
        logger.error(f"Error en la recuperación de contraseña por reconocimiento facial: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor.")

@router.delete("/delete-user", status_code=status.HTTP_200_OK)
async def delete_user(
    payload: UserDeleteRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Permite a un propietario eliminar un usuario y todos sus datos asociados.
    """
    if not current_user.is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo los propietarios pueden eliminar usuarios.")

    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            await auth_service.delete_user_and_data(payload.username)
        logger.info(f"Usuario {payload.username} eliminado exitosamente por el propietario {current_user.nombre}")
        return {"message": f"Usuario {payload.username} y sus datos asociados eliminados exitosamente."}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error al eliminar usuario {payload.username}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno del servidor al eliminar usuario.")

    