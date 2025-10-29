"""
Servicios de autenticación para el sistema.
"""
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from src.db.database import get_db
from src.db.models import User
from src.auth import jwt_manager

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/auth/login")

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_user(self, username: str, password: str, is_owner: bool = False) -> User:
        """
        Registra un nuevo usuario en el sistema.
        """
        # Verificar si el usuario ya existe
        result = await self.db.execute(select(User).filter(User.nombre == username))
        if result.first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre de usuario ya está en uso"
            )

        # Hash de la contraseña
        truncated_password_bytes = password.encode('utf-8')[:72]
        hashed_password = pwd_context.hash(truncated_password_bytes)

        # Crear nuevo usuario
        user = User(
            nombre=username,
            hashed_password=hashed_password,
            is_owner=is_owner,
            embedding="[]"  # Vector vacío por defecto
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def authenticate_user(self, username: str, password: str) -> dict:
        """
        Autentica un usuario y genera un token JWT.
        """
        result = await self.db.execute(select(User).filter(User.nombre == username))
        user = result.scalar_one_or_none()
        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )

        if not pwd_context.verify(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )

        # Generar token JWT de acceso
        access_token_expires = timedelta(minutes=jwt_manager.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=jwt_manager.REFRESH_TOKEN_EXPIRE_DAYS)

        access_token = jwt_manager.create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        refresh_token = jwt_manager.create_refresh_token(
            data={"sub": str(user.id)},
            expires_delta=refresh_token_expires
        )

        user.refresh_token = refresh_token
        await self.db.commit()
        await self.db.refresh(user)

        return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

    async def refresh_access_token(self, refresh_token: str) -> dict:
        """
        Refresca el token de acceso utilizando un refresh token válido.
        """
        try:
            payload = verify_token(refresh_token)
        except HTTPException:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido o expirado"
            )

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido"
            )

        result = await self.db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or user.refresh_token != refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido o no coincide"
            )

        # Generar nuevo access token
        new_access_token = create_access_token(
            {
                "user_id": user.id,
                "username": user.nombre,
                "is_owner": user.is_owner
            },
            expires_delta=timedelta(minutes=2)
        )

        # Generar nuevo refresh token y actualizar en la base de datos
        new_refresh_token = create_access_token(
            {
                "user_id": user.id,
                "username": user.nombre,
                "is_owner": user.is_owner
            },
            expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        )

        user.refresh_token = new_refresh_token
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

    async def get_user_profile(self, user_id: int) -> dict:
        """
        Obtiene el perfil de un usuario.
        """
        result = await self.db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )

        return {
            "id": user.id,
            "username": user.nombre,
            "is_owner": user.is_owner
        }


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt_manager.verify_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    async with db as session:
        result = await session.execute(select(User).filter(User.id == user_id))
        user = result.scalars().first()
    
    if user is None:
        raise credentials_exception
    return user