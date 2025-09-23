from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from src.db.database import SessionLocal
from src.api.speaker_schemas import SpeakerIdentifyResponse, UserListResponse, UserCharacteristic, SpeakerUpdateOwnerRequest
from src.api.schemas import StatusResponse
import logging
from pathlib import Path
import tempfile
from src.db.models import User

# Importar módulos globales desde utils
from src.api import utils

speaker_router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@speaker_router.post("/speaker/register", response_model=StatusResponse)
async def register_speaker(name: str = Form(...), audio_file: UploadFile = File(...), is_owner: bool = Form(False), db: Session = Depends(get_db)):
    """Registra un nuevo usuario con su voz."""
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            file_location = Path(tmpdir) / audio_file.filename
            with open(file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)
            
            success = utils._speaker_module.register_speaker(name, str(file_location), is_owner=is_owner)

        if success and is_owner:
            utils._nlp_module._config["owner_name"] = name
            utils._nlp_module._save_config()
            utils.initialize_nlp()

        if not success:
            raise HTTPException(status_code=500, detail="No se pudo registrar al hablante")
        
        response_data = utils.get_module_status()
        utils._save_api_log("/speaker/register", {"name": name, "filename": audio_file.filename, "is_owner": is_owner}, response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error al registrar hablante: {e}")
        raise HTTPException(status_code=500, detail="Error al registrar el hablante")

@speaker_router.post("/speaker/register_owner", response_model=StatusResponse)
async def register_owner_speaker(name: str = Form(...), audio_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Registra un nuevo usuario como propietario con su voz."""
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            file_location = Path(tmpdir) / audio_file.filename
            with open(file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)
            
            success = utils._speaker_module.register_speaker(name, str(file_location), is_owner=True)

        if success:
            utils._nlp_module._config["owner_name"] = name
            utils._nlp_module._save_config()
            utils.initialize_nlp()

        if not success:
            raise HTTPException(status_code=500, detail="No se pudo registrar al propietario")
        
        response_data = utils.get_module_status()
        utils._save_api_log("/speaker/register_owner", {"name": name, "filename": audio_file.filename}, response_data.dict(), db)
        return response_data
        
    except Exception as e:
        logging.error(f"Error al registrar propietario: {e}")
        raise HTTPException(status_code=500, detail="Error al registrar el propietario")

@speaker_router.post("/speaker/identify", response_model=SpeakerIdentifyResponse)
async def identify_speaker(audio_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Identifica quién habla."""
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            file_location = Path(tmpdir) / audio_file.filename
            with open(file_location, "wb+") as file_object:
                content = await audio_file.read()
                file_object.write(content)
            
            identified_user = utils._speaker_module.identify_speaker(str(file_location))

        if identified_user is None:  # Check for None explicitly
            raise HTTPException(status_code=500, detail="No se pudo identificar al hablante")
        
        response_obj = SpeakerIdentifyResponse(speaker_name=identified_user.nombre, user_id=identified_user.id, is_owner=identified_user.is_owner)
        utils._save_api_log("/speaker/identify", {"filename": audio_file.filename}, response_obj.dict(), db)
        return response_obj
        
    except Exception as e:
        logging.error(f"Error al identificar hablante: {e}")
        raise HTTPException(status_code=500, detail="Error al identificar el hablante")

@speaker_router.get("/speaker/users", response_model=UserListResponse)
async def get_all_users(db: Session = Depends(get_db)):
    """Obtiene la lista de todos los usuarios registrados y sus características."""
    try:
        users = db.query(User).all()
        user_characteristics = [
            UserCharacteristic(id=user.id, name=user.nombre, is_owner=user.is_owner)
            for user in users
        ]
        response_data = UserListResponse(user_count=len(user_characteristics), users=user_characteristics)
        utils._save_api_log("/speaker/users", {}, response_data.dict(), db)
        return response_data
    except Exception as e:
        logging.error(f"Error al obtener la lista de usuarios: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener la lista de usuarios")

@speaker_router.put("/speaker/update_owner", response_model=StatusResponse)
async def update_speaker_owner(request: SpeakerUpdateOwnerRequest, db: Session = Depends(get_db)):
    """Actualiza el estado de propietario de un usuario registrado."""
    if utils._speaker_module is None or not utils._speaker_module.is_online():
        raise HTTPException(status_code=503, detail="El módulo de hablante está fuera de línea")
    
    try:
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        user.is_owner = request.is_owner
        db.commit()
        db.refresh(user)

        if request.is_owner:
            utils._nlp_module._config["owner_name"] = user.nombre
            utils._nlp_module._save_config()
            utils._nlp_module.reload()
        else:
            # If the owner is being removed, check if this was the current owner
            if utils._nlp_module._config.get("owner_name") == user.nombre:
                utils._nlp_module._config["owner_name"] = None
                utils._nlp_module._save_config()
                utils._nlp_module.reload()

        response_data = utils.get_module_status()
        utils._save_api_log("/speaker/update_owner", request.dict(), response_data.dict(), db)
        return response_data

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logging.error(f"Error al actualizar el estado de propietario del hablante: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar el estado de propietario del hablante")