from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from jose import JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from src.db.database import get_db
from src.db.models import User
from src.auth import jwt_manager
import logging

logger = logging.getLogger("AuthService")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/auth/login")

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    async def get_user_by_name(db: AsyncSession, username: str) -> "User | None":
        """
        Obtiene un usuario por su nombre de usuario.
        """
        result = await db.execute(select(User).filter(User.nombre == username))
        return result.scalar_one_or_none()

    async def register_user(self, username: str, password: str, is_owner: bool = False, face_embedding: str = None, speaker_embedding: str = None) -> User:
        """
        Registra un nuevo usuario en el sistema.
        """
        logger.info(f"Intentando registrar nuevo usuario: {username}")
        result = await self.db.execute(select(User).filter(User.nombre == username))
        if result.first():
            logger.warning(f"Intento de registro fallido: el usuario {username} ya existe.")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El nombre de usuario ya está en uso"
            )
        truncated_password_bytes = password.encode('utf-8')[:72]
        hashed_password = pwd_context.hash(truncated_password_bytes)

        user = User(
            nombre=username,
            hashed_password=hashed_password,
            is_owner=is_owner,
            face_embedding=face_embedding,
            speaker_embedding=speaker_embedding
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        logger.info(f"Usuario {username} registrado exitosamente con ID: {user.id}")
        return user

    async def authenticate_user(self, username: str, password: str) -> dict:
        """
        Autentica un usuario y genera un token JWT.
        """
        logger.info(f"Intentando autenticar usuario: {username}")
        result = await self.db.execute(select(User).filter(User.nombre == username))
        user = result.scalar_one_or_none()
        if not user or not user.hashed_password:
            logger.warning(f"Intento de autenticación fallido para {username}: usuario no encontrado o sin contraseña.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )

        if not pwd_context.verify(password, user.hashed_password):
            logger.warning(f"Intento de autenticación fallido para {username}: contraseña incorrecta.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )

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
        logger.info(f"Usuario {username} autenticado exitosamente. Tokens generados.")

        return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

    async def refresh_access_token(self, refresh_token: str) -> dict:
        """
        Refresca el token de acceso utilizando un refresh token válido.
        """
        logger.info("Intentando refrescar token de acceso.")
        try:
            payload = jwt_manager.verify_token(refresh_token)
        except HTTPException as e:
            logger.warning(f"Fallo al refrescar token: {e.detail}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido o expirado"
            )

        user_id = payload.get("sub")
        if not user_id:
            logger.warning("Fallo al refrescar token: sub no encontrado en el payload.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido"
            )

        result = await self.db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or user.refresh_token != refresh_token:
            logger.warning(f"Fallo al refrescar token para user_id {user_id}: token inválido o no coincide.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido o no coincide"
            )

        new_access_token = jwt_manager.create_access_token(
            {
                "sub": str(user.id),
                "username": user.nombre,
                "is_owner": user.is_owner
            },
            expires_delta=timedelta(minutes=2)
        )

        new_refresh_token = jwt_manager.create_refresh_token(
            {
                "sub": str(user.id),
                "username": user.nombre,
                "is_owner": user.is_owner
            },
            expires_delta=timedelta(days=jwt_manager.REFRESH_TOKEN_EXPIRE_DAYS)
        )

        user.refresh_token = new_refresh_token
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        logger.info(f"Tokens refrescados exitosamente para user_id: {user_id}")

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

    async def authenticate_user_by_id(self, user_id: int) -> dict:
        """
        Autentica un usuario por su ID y genera un token JWT.
        """
        logger.info(f"Intentando autenticar usuario por ID: {user_id}")
        result = await self.db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            logger.warning(f"Fallo al autenticar por ID: usuario {user_id} no encontrado.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado"
            )

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
        logger.info(f"Usuario con ID {user_id} autenticado exitosamente por ID.")

        return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

    async def get_user_profile(self, user_id: int) -> dict:
        """
        Obtiene el perfil de un usuario.
        """
        logger.info(f"Intentando obtener perfil de usuario para ID: {user_id}")
        result = await self.db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            logger.warning(f"Fallo al obtener perfil: usuario {user_id} no encontrado.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        logger.info(f"Perfil de usuario para ID {user_id} obtenido exitosamente.")
        return {
            "id": user.id,
            "username": user.nombre,
            "is_owner": user.is_owner
        }

    async def get_owner_users(self) -> list[dict]:
        """
        Obtiene la lista de usuarios que son propietarios.

        Returns:
            list[dict]: Lista con dicts {id, username, is_owner} de propietarios.
        """
        logger.info("Obteniendo lista de usuarios propietarios")
        result = await self.db.execute(select(User).filter(User.is_owner == True))
        owners = result.scalars().all()
        logger.debug(f"Se encontraron {len(owners)} usuarios propietarios")
        return [
            {"id": u.id, "username": u.nombre, "is_owner": u.is_owner}
            for u in owners
        ]

    async def get_non_owner_users(self) -> list[dict]:
        """
        Obtiene la lista de usuarios que NO son propietarios.

        Returns:
            list[dict]: Lista con dicts {id, username, is_owner=False} de miembros.
        """
        logger.info("Obteniendo lista de usuarios no propietarios")
        result = await self.db.execute(select(User).filter(User.is_owner == False))
        users = result.scalars().all()
        logger.debug(f"Se encontraron {len(users)} usuarios no propietarios")
        return [
            {"id": u.id, "username": u.nombre, "is_owner": u.is_owner}
            for u in users
        ]

    async def verify_current_password(self, user_id: int, current_password: str) -> bool:
        """
        Verifica que la contraseña actual proporcionada coincida con la almacenada.
        """
        result = await self.db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.hashed_password:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

        return pwd_context.verify(current_password, user.hashed_password)

    async def update_username(self, user_id: int, new_username: str, current_password: str) -> dict:
        """
        Actualiza el nombre de usuario tras verificar la contraseña actual.
        """
        # Verificar contraseña actual
        if not await self.verify_current_password(user_id, current_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Contraseña actual incorrecta")

        # Obtener usuario actual
        result = await self.db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

        # Si el nuevo nombre es igual al actual, no hacer nada y retornar
        if (new_username or "").strip() == (user.nombre or "").strip():
            return {"id": user.id, "username": user.nombre}

        # Validar que no exista otro usuario (distinto al actual) con el nuevo nombre
        existing = await self.db.execute(select(User).filter(User.nombre == new_username))
        existing_user = existing.scalar_one_or_none()
        if existing_user and existing_user.id != user.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El nombre de usuario ya está en uso")

        # Actualizar nombre
        user.nombre = new_username
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return {"id": user.id, "username": user.nombre}

    async def update_password(self, user_id: int, new_password: str, current_password: str) -> dict:
        """
        Actualiza la contraseña tras verificar la contraseña actual.
        """
        if not await self.verify_current_password(user_id, current_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Contraseña actual incorrecta")

        truncated_password_bytes = new_password.encode('utf-8')[:72]
        hashed_password = pwd_context.hash(truncated_password_bytes)

        result = await self.db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

        user.hashed_password = hashed_password
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return {"id": user.id, "username": user.nombre}


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    logger.debug("Intentando obtener usuario actual desde el token.")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt_manager.verify_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Fallo al obtener usuario actual: user_id no encontrado en el payload.")
            raise credentials_exception
    except JWTError:
        logger.error("Fallo al obtener usuario actual: JWTError al verificar el token.")
        raise credentials_exception
    
    async with db as session:
        result = await session.execute(select(User).filter(User.id == user_id))
        user = result.scalars().first()
    
    if user is None:
        logger.warning(f"Fallo al obtener usuario actual: usuario con ID {user_id} no encontrado en la DB.")
        raise credentials_exception
    logger.info(f"Usuario actual con ID {user_id} obtenido exitosamente.")
    return user
    