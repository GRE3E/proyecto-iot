from fastapi import FastAPI
from .api.routes import router, initialize_nlp

app = FastAPI(title="Casa Inteligente API")

@app.on_event("startup")
async def startup_event():
    """Inicializa los módulos necesarios al arrancar la aplicación."""
    initialize_nlp()

# Incluye las rutas de la API
app.include_router(router, prefix="")