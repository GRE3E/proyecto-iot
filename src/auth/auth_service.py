"""
Servicios de autenticación para el sistema.
"""
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from fastapi import HTTPException, status

from src.db.models import User
from .jwt_manager import create_access_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
        hashed_password = pwd_context.hash(password[:72])

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

        # Generar token JWT
        access_token = create_access_token(
            {
                "user_id": user.id,
                "username": user.nombre,
                "is_owner": user.is_owner
            },
            expires_delta=timedelta(minutes=30)
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.nombre,
                "is_owner": user.is_owner
            }
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