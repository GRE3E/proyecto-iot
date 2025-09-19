import logging
from typing import Generator, Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from src.db.models import Base, UserMemory, ConversationLog
from src.db.database import engine, SessionLocal # Importar engine y SessionLocal
from datetime import datetime

class MemoryManager:
    def __init__(self):
        """Inicializa la conexión con Ollama y carga la configuración."""
        self.engine = engine
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = SessionLocal
        self._initialize_user_memory()

    def _initialize_user_memory(self):
        db = next(self.get_db())
        try:
            if not db.query(UserMemory).first():
                new_memory = UserMemory()
                db.add(new_memory)
                db.commit()
                logging.info("UserMemory initialized.")
        except Exception as e:
            logging.error(f"Error initializing UserMemory: {e}")
        finally:
            db.close()

    def get_db(self) -> Generator[Session, None, None]:
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def get_user_memory(self, db: Session) -> UserMemory:
        memory_db = db.query(UserMemory).first()
        if not memory_db:
            memory_db = UserMemory()
            db.add(memory_db)
            db.commit()
            db.refresh(memory_db)
        return memory_db

    def update_memory(self, prompt: str, response: str, db: Session):
        timestamp = datetime.now()

        memory_db = self.get_user_memory(db)

        memory_db.last_interaction = timestamp
        db.commit()
        db.refresh(memory_db)

        conversation = ConversationLog(
            timestamp=timestamp,
            prompt=prompt,
            response=response
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

        logging.info("Memoria de usuario y log de conversación actualizados.")