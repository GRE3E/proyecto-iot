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

class Preference(Base):
    __tablename__ = "preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    # Agrega campos de preferencia aquí
    # Ejemplo: theme = Column(String(50), default="dark")
    # Ejemplo: notification_settings = Column(Text, default="{}")

    user = relationship("User", back_populates="preferences")