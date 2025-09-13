from fastapi import FastAPI
from src.api.routes import router
from src.db.database import Base, engine
from src.db.models import UserMemory, ConversationLog, APILog, TTSLog # Importa TTSLog
from src.api.routes import initialize_nlp

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    initialize_nlp()

app.include_router(router)