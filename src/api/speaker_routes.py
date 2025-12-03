from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from sqlalchemy import select
from src.db.database import get_db
from src.api.speaker_schemas import UserListResponse, UserCharacteristic, SpeakerUpdateOwnerRequest
from src.api.schemas import StatusResponse
import logging
from pathlib import Path
import tempfile
from src.db.models import User
from src.api import utils
from src.auth.auth_service import AuthService, get_current_user
from src.api.auth_schemas import Token

logger = logging.getLogger("APIRoutes")

speaker_router = APIRouter()

@speaker_router.post("/speaker/register", response_model=Token)
async def register_speaker(
    name: str = Form(...),
    audio_file: UploadFile = File(...),
    is_owner: bool = Form(False)
):
    """Registra un nuevo usuario con su voz y devuelve un token de autenticación."""
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")

    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            generated_password = utils.generate_random_password()

            existing_user = await auth_service.get_user_by_name(db, name)

            if existing_user:
                if existing_user.speaker_embedding is None:
                    with tempfile.TemporaryDirectory() as tmpdir:
                        file_location = Path(tmpdir) / audio_file.filename
                        with open(file_location, "wb+") as file_object:
                            content = await audio_file.read()
                            file_object.write(content)

                        embedding_str = await utils._speaker_module.update_speaker_voice(
                            existing_user.id, str(file_location)
                        )

                    if embedding_str is None:
                        raise HTTPException(status_code=409, detail="La voz proporcionada ya está registrada por otro usuario.")

                    existing_user.speaker_embedding = embedding_str
                    await db.commit()
                    await db.refresh(existing_user)

                    token = await auth_service.authenticate_user_by_id(existing_user.id)

                    await utils._save_api_log(
                        "/speaker/register",
                        {"name": name, "filename": audio_file.filename, "is_owner": is_owner},
                        token,
                        db
                    )
                    logger.info(f"Embedding de voz actualizado para el usuario {name} exitosamente")
                    return token
                else:
                    raise HTTPException(status_code=409, detail="El usuario ya tiene un embedding de voz registrado.")
            else:
                with tempfile.TemporaryDirectory() as tmpdir:
                    file_location = Path(tmpdir) / audio_file.filename
                    with open(file_location, "wb+") as file_object:
                        content = await audio_file.read()
                        file_object.write(content)

                    embedding_str = await utils._speaker_module.register_speaker(
                        name, str(file_location), is_owner=is_owner
                    )

                if embedding_str is None:
                    raise HTTPException(status_code=409, detail="La voz ya está registrada por otro usuario.")

                await auth_service.register_user(
                    username=name,
                    password=generated_password,
                    is_owner=is_owner,
                    speaker_embedding=embedding_str
                )
                token = await auth_service.authenticate_user(
                    username=name,
                    password=generated_password
                )

                await utils._save_api_log(
                    "/speaker/register",
                    {"name": name, "filename": audio_file.filename, "is_owner": is_owner},
                    token,
                    db
                )

                logger.info(f"Usuario {name} registrado por voz exitosamente")
                return token

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error al registrar hablante para /speaker/register: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al registrar el hablante")

@speaker_router.post("/speaker/register_owner", response_model=Token)
async def register_owner_speaker(
    name: str = Form(...),
    audio_file: UploadFile = File(...)
):
    """Registra un nuevo usuario como propietario con su voz y devuelve un token de autenticación."""
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    
    try:
        async with get_db() as db:
            auth_service = AuthService(db)
            generated_password = utils.generate_random_password()

        with tempfile.TemporaryDirectory() as tmpdir:
            file_location = Path(tmpdir) / audio_file.filename
            with open(file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)
            
            embedding_str = await utils._speaker_module.register_speaker(
                name, str(file_location), is_owner=True
            )

        if embedding_str is None:
            raise HTTPException(status_code=409, detail="La voz ya está registrada por otro usuario.")
        
        async with get_db() as db:
            auth_service = AuthService(db)
            
            await auth_service.register_user(
                username=name,
                password=generated_password,
                is_owner=True,
                speaker_embedding=embedding_str
            )
            token = await auth_service.authenticate_user(
                username=name,
                password=generated_password
            )

            await utils._save_api_log(
                "/speaker/register_owner",
                {"name": name, "filename": audio_file.filename},
                token,
                db
            )

        logger.info(f"Usuario {name} registrado por voz como propietario exitosamente")
        return token
        
    except Exception as e:
        logger.error(f"Error al registrar propietario para /speaker/register_owner: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al registrar el propietario")

@speaker_router.post("/speaker/identify", response_model=Token)
async def identify_speaker(audio_file: UploadFile = File(...)):
    """Identifica quién habla y devuelve su token de acceso. Si no hay usuarios registrados o no se identifica al usuario, indica que se necesita registro."""
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    
    try:
        async with get_db() as db:
            result = await db.execute(select(User))
            users = result.scalars().all()
            if not users:
                logger.info("No hay usuarios registrados en el sistema")
                raise HTTPException(status_code=404, detail="No hay usuarios registrados")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            file_location = Path(tmpdir) / audio_file.filename
            with open(file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)
            
            identified_user, _ = await utils._speaker_module.identify_speaker(str(file_location))

        if identified_user is None:
            raise HTTPException(status_code=404, detail="Usuario no identificado")
        
        async with get_db() as db:
            auth_service = AuthService(db)
            token = await auth_service.authenticate_user_by_id(identified_user.id)
            
            await utils._save_api_log(
                "/speaker/identify",
                {"filename": audio_file.filename},
                {"user_id": identified_user.id, "speaker_name": identified_user.nombre},
                db
            )

        logger.info(f"Usuario {identified_user.nombre} identificado por voz exitosamente")
        return token
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error al identificar hablante para /speaker/identify: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al identificar el hablante")

@speaker_router.post(
    "/speaker/add_voice_to_user",
    response_model=Token,
    dependencies=[Depends(get_current_user)]
)
async def add_voice_to_user(
    user_id: int = Form(...),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Añade un registro de voz a una cuenta de usuario ya existente."""
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    
    try:
        async with get_db() as db:
            result = await db.execute(select(User).filter(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=404, detail=f"Usuario con ID '{user_id}' no encontrado.")

            with tempfile.TemporaryDirectory() as tmpdir:
                file_location = Path(tmpdir) / audio_file.filename
                with open(file_location, "wb+") as file_object:
                    content = await audio_file.read()
                    file_object.write(content)
                
                embedding_str = await utils._speaker_module.update_speaker_voice(user.id, str(file_location))

            if embedding_str is None:
                raise HTTPException(status_code=409, detail="La voz proporcionada ya está registrada por otro usuario.")
            
            user.speaker_embedding = embedding_str
            await db.commit()
            await db.refresh(user)

            auth_service = AuthService(db)
            token = await auth_service.authenticate_user_by_id(user.id)

            await utils._save_api_log(
                "/speaker/add_voice_to_user",
                {"user_id": user_id, "filename": audio_file.filename},
                token,
                db
            )

            logger.info(f"Voz añadida al usuario con ID '{user_id}' exitosamente.")
            return token
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error al añadir voz al usuario para /speaker/add_voice_to_user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al añadir voz al usuario.")

@speaker_router.get(
    "/speaker/users",
    response_model=UserListResponse,
    dependencies=[Depends(get_current_user)]
)
async def get_all_users():
    """Obtiene la lista de todos los usuarios registrados y sus características."""
    try:
        async with get_db() as db:
            result = await db.execute(select(User))
            users = result.scalars().all()
            user_characteristics = [
                UserCharacteristic(id=user.id, name=user.nombre, is_owner=user.is_owner)
                for user in users
            ]
            response_data = UserListResponse(
                user_count=len(user_characteristics),
                users=user_characteristics
            )
            await utils._save_api_log("/speaker/users", {}, response_data.dict(), db)
            return response_data
    except Exception as e:
        logger.error(f"Error al obtener la lista de usuarios para /speaker/users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener la lista de usuarios")

@speaker_router.post(
    "/speaker/update_owner",
    response_model=StatusResponse,
    dependencies=[Depends(get_current_user)]
)
async def update_speaker_owner(request: SpeakerUpdateOwnerRequest):
    """Actualiza el estado de propietario de un usuario registrado."""
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    
    try:
        async with get_db() as db:
            result = await db.execute(select(User).filter(User.id == request.user_id))
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
            user.is_owner = request.is_owner
            await db.commit()
            await db.refresh(user)

            response_data = utils.get_module_status()
            await utils._save_api_log(
                "/speaker/update_owner",
                request.dict(),
                response_data.dict(),
                db
            )
            return response_data

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error al actualizar el estado de propietario del hablante para /speaker/update_owner: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al actualizar el estado de propietario del hablante")
