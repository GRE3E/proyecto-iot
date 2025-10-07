from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.sql import func
from .database import Base
from typing import List

# Tabla de asociación para la relación muchos a muchos entre IoTCommand y Permission
iot_command_permission_association = Table(
    'iot_command_permission_association',
    Base.metadata,
    Column('iot_command_id', Integer, ForeignKey('iot_commands.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)
"""
Tabla de asociación para la relación muchos a muchos entre IoTCommand y Permission.
Permite asignar múltiples permisos a un comando IoT y un permiso a múltiples comandos IoT.
"""

class UserMemory(Base):
    __tablename__ = "user_memory"
    """
    Modelo para almacenar la memoria del usuario, incluyendo estados de dispositivos y preferencias.

    Atributos:
        id (int): Identificador único de la memoria del usuario.
        device_states (str): Estado de los dispositivos en formato JSON.
        user_preferences (str): Preferencias del usuario en formato JSON.
        last_interaction (datetime): Marca de tiempo de la última interacción del usuario.
    """
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    device_states = Column(Text, default="{}")
    user_preferences = Column(Text, default="{}")
    last_interaction = Column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="memory")

class ConversationLog(Base):
    __tablename__ = "conversation_log"
    """
    Modelo para registrar el historial de conversaciones con el asistente.

    Atributos:
        id (int): Identificador único del registro de conversación.
        user_id (int): ID del usuario al que pertenece esta conversación.
        timestamp (datetime): Marca de tiempo de la conversación.
        prompt (str): El mensaje de entrada del usuario.
        response (str): La respuesta generada por el asistente.
        speaker_identifier (str): Identificador del hablante (opcional).
    """
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    timestamp = Column(DateTime, default=func.now())
    prompt = Column(Text)
    response = Column(Text)
    speaker_identifier = Column(String(100), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="conversation_logs")

class APILog(Base):
    __tablename__ = "api_log"
    """
    Modelo para registrar las interacciones de la API.

    Atributos:
        id (int): Identificador único del registro de API.
        timestamp (datetime): Marca de tiempo de la interacción.
        endpoint (str): El endpoint de la API accedido.
        request_body (str): Cuerpo de la solicitud en formato JSON.
        response_data (str): Datos de la respuesta en formato JSON.
    """
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now())
    endpoint = Column(String(100))
    request_body = Column(Text)
    response_data = Column(Text)

class IoTCommand(Base):
    __tablename__ = "iot_commands"
    """
    Modelo para definir comandos IoT que el asistente puede ejecutar.

    Atributos:
        id (int): Identificador único del comando IoT.
        name (str): Nombre único del comando.
        description (str): Descripción del comando.
        command_type (str): Tipo de comando (e.g., "serial", "mqtt").
        command_payload (str): Carga útil del comando.
        mqtt_topic (str): Tópico MQTT si el tipo de comando es "mqtt" (opcional).
        permissions (List[Permission]): Permisos asociados a este comando.
    """
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    command_type = Column(String(50), nullable=False) # e.g., "serial", "mqtt"
    command_payload = Column(Text, nullable=False)
    mqtt_topic = Column(String(255), nullable=True) # Solo si command_type es "mqtt"

    permissions: Mapped[List["Permission"]] = relationship("Permission", secondary=iot_command_permission_association, back_populates="iot_commands")

class User(Base):
    __tablename__ = "users"
    """
    Modelo para representar a los usuarios del sistema.

    Atributos:
        id (int): Identificador único del usuario.
        nombre (str): Nombre único del usuario.
        embedding (str): Vector de incrustación del usuario (serializado).
        is_owner (bool): Indica si el usuario es el propietario del sistema.
        preferences (List[Preference]): Preferencias del usuario.
        permissions (List[UserPermission]): Permisos del usuario.
    """
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), unique=True, nullable=False)
    embedding = Column(Text, nullable=False) # Vector serializado
    is_owner = Column(Boolean, default=False) # Nuevo campo para identificar al propietario

    preferences: Mapped[List["Preference"]] = relationship("Preference", back_populates="user") # Cambiado a uno a muchos
    permissions: Mapped[List["UserPermission"]] = relationship("UserPermission", back_populates="user")
    memory: Mapped["UserMemory"] = relationship("UserMemory", back_populates="user", uselist=False)
    conversation_logs: Mapped[List["ConversationLog"]] = relationship("ConversationLog", back_populates="user")

    def has_permission(self, permission_name: str) -> bool:
        """
        Verifica si el usuario tiene un permiso específico.

        Args:
            permission_name (str): El nombre del permiso a verificar.

        Returns:
            bool: True si el usuario tiene el permiso, False en caso contrario.
        """
        if self.is_owner:
            return True
        for user_permission in self.permissions:
            if user_permission.permission.name == permission_name:
                return True
        return False

    def __repr__(self) -> str:
        return f"<User(id={self.id}, nombre='{self.nombre}', is_owner={self.is_owner})>"


class Preference(Base):
    __tablename__ = "preferences"
    """
    Modelo para almacenar las preferencias individuales de cada usuario.

    Atributos:
        id (int): Identificador único de la preferencia.
        user_id (int): ID del usuario al que pertenece la preferencia.
        key (str): Clave de la preferencia (e.g., "theme", "light_color").
        value (str): Valor de la preferencia (e.g., "dark", "warm").
        user (User): El usuario al que pertenece esta preferencia.
    """
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Clave foránea a User
    key = Column(String(100), nullable=False) # Nombre de la preferencia (ej. "theme", "light_color")
    value = Column(Text, nullable=False) # Valor de la preferencia (ej. "dark", "warm")

    user: Mapped["User"] = relationship("User", back_populates="preferences") # Relación con User

class Permission(Base):
    __tablename__ = "permissions"
    """
    Modelo para definir los diferentes tipos de permisos en el sistema.

    Atributos:
        id (int): Identificador único del permiso.
        name (str): Nombre único del permiso (e.g., "read", "write", "admin").
        users (List[UserPermission]): Usuarios que tienen este permiso.
        iot_commands (List[IoTCommand]): Comandos IoT asociados a este permiso.
    """
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False) # e.g., "read", "write", "admin"

    users: Mapped[List["UserPermission"]] = relationship("UserPermission", back_populates="permission")
    iot_commands: Mapped[List["IoTCommand"]] = relationship("IoTCommand", secondary=iot_command_permission_association, back_populates="permissions")

    def __repr__(self) -> str:
        return f"<Permission(id={self.id}, name='{self.name}')>"


class UserPermission(Base):
    __tablename__ = "user_permissions"
    """
    Modelo de asociación para la relación muchos a muchos entre User y Permission.

    Atributos:
        user_id (int): ID del usuario.
        permission_id (int): ID del permiso.
        user (User): El usuario asociado.
        permission (Permission): El permiso asociado.
    """
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), primary_key=True)

    user: Mapped["User"] = relationship("User", back_populates="permissions")
    permission: Mapped["Permission"] = relationship("Permission", back_populates="users")

    def __repr__(self) -> str:
        return f"<UserPermission(user_id={self.user_id}, permission_id={self.permission_id})>"