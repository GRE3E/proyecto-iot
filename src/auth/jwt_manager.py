from datetime import datetime, timedelta
from typing import Dict, Optional
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger("JWTManager")

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY_JWT").strip()
ALGORITHM = os.getenv("ALGORITHM_JWT", "HS256").strip()
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 2))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

if not SECRET_KEY:
    logger.critical("La variable de entorno SECRET_KEY_JWT no está configurada.")
    raise ValueError("La variable de entorno SECRET_KEY_JWT no está configurada.")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un token JWT de acceso con los datos proporcionados.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    logger.debug(f"Access token creado para el sub: {data.get('sub')}")
    return encoded_jwt

def create_refresh_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un token JWT de refresco con los datos proporcionados.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    logger.debug(f"Refresh token creado para el sub: {data.get('sub')}")
    return encoded_jwt

def verify_token(token: str) -> Dict:
    """
    Verifica y decodifica un token JWT.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        logger.debug("Token JWT verificado exitosamente.")
        return payload
    except JWTError as e:
        logger.error(f"Error al verificar el token JWT: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict:
    """
    Obtiene el usuario actual a partir del token JWT.
    """
    logger.debug("Intentando obtener el usuario actual a partir del token.")
    return verify_token(token)
    