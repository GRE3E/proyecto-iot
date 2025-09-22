from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime # Importar ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class UserMemory(Base):
    __tablename__ = "user_memory"

    id = Column(Integer, primary_key=True, default=1)
    device_states = Column(Text, default="{}")
    user_preferences = Column(Text, default="{}")
    last_interaction = Column(DateTime, nullable=True)

class ConversationLog(Base):
    __tablename__ = "conversation_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now())
    prompt = Column(Text)
    response = Column(Text)

class APILog(Base):
    __tablename__ = "api_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now())
    endpoint = Column(String(100))
    request_body = Column(Text)
    response_data = Column(Text)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), unique=True, nullable=False)
    embedding = Column(Text, nullable=False) # Vector serializado
    is_owner = Column(Boolean, default=False) # Nuevo campo para identificar al propietario

    preferences = relationship("Preference", back_populates="user", uselist=False)
    permissions = relationship("UserPermission", back_populates="user")

    def has_permission(self, permission_name: str) -> bool:
        if self.is_owner:
            return True
        for user_permission in self.permissions:
            if user_permission.permission.name == permission_name:
                return True
        return False

    def __repr__(self):
        return f"<User(id={self.id}, nombre='{self.nombre}', is_owner={self.is_owner})>"


class Preference(Base):
    __tablename__ = "preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    # Agrega campos de preferencia aquí
    # Ejemplo: theme = Column(String(50), default="dark")
    # Ejemplo: notification_settings = Column(Text, default="{}")

    user = relationship("User", back_populates="preferences")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False) # e.g., "read", "write", "admin"

    users = relationship("UserPermission", back_populates="permission")

    def __repr__(self):
        return f"<Permission(id={self.id}, name='{self.name}')>"


class UserPermission(Base):
    __tablename__ = "user_permissions"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), primary_key=True)

    user = relationship("User", back_populates="permissions")
    permission = relationship("Permission", back_populates="users")

    def __repr__(self):
        return f"<UserPermission(user_id={self.user_id}, permission_id={self.permission_id})>"