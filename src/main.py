from fastapi import FastAPI
from .api.routes import router, initialize_nlp
from .db.database import Base, engine
from .db import models # Import models to ensure they are registered with Base

app = FastAPI(title="Casa Inteligente API")

@app.on_event("startup")
async def startup_event():
    """Inicializa los módulos necesarios al arrancar la aplicación."""
    Base.metadata.create_all(bind=engine)
    initialize_nlp()

# Incluye las rutas de la API
app.include_router(router, prefix="")