from sqlalchemy import Column, Integer, String, Text, DateTime
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