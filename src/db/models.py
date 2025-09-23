from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime, Table # Importar ForeignKey y Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# Tabla de asociación para la relación muchos a muchos entre IoTCommand y Permission
iot_command_permission_association = Table(
    'iot_command_permission_association',
    Base.metadata,
    Column('iot_command_id', Integer, ForeignKey('iot_commands.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)

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
    speaker_identifier = Column(String(100), nullable=True)

class APILog(Base):
    __tablename__ = "api_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now())
    endpoint = Column(String(100))
    request_body = Column(Text)
    response_data = Column(Text)

class IoTCommand(Base):
    __tablename__ = "iot_commands"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    command_type = Column(String(50), nullable=False) # e.g., "serial", "mqtt"
    command_payload = Column(Text, nullable=False)
    mqtt_topic = Column(String(255), nullable=True) # Solo si command_type es "mqtt"

    permissions = relationship("Permission", secondary=iot_command_permission_association, back_populates="iot_commands")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), unique=True, nullable=False)
    embedding = Column(Text, nullable=False) # Vector serializado
    is_owner = Column(Boolean, default=False) # Nuevo campo para identificar al propietario

    preferences = relationship("Preference", back_populates="user") # Cambiado a uno a muchos
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Clave foránea a User
    key = Column(String(100), nullable=False) # Nombre de la preferencia (ej. "theme", "light_color")
    value = Column(Text, nullable=False) # Valor de la preferencia (ej. "dark", "warm")

    user = relationship("User", back_populates="preferences") # Relación con User

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False) # e.g., "read", "write", "admin"

    users = relationship("UserPermission", back_populates="permission")
    iot_commands = relationship("IoTCommand", secondary=iot_command_permission_association, back_populates="permissions")

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