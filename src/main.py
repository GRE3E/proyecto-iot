import os
import asyncio
import logging

# IMPORTANTE: Configurar la política del bucle de eventos ANTES de cualquier otra importación
if os.name == 'nt':  # Windows
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from dotenv import load_dotenv
from fastapi import FastAPI
from src.api.routes import router
from src.api.hotword_routes import hotword_router
from src.api.nlp_routes import nlp_router
from src.api.stt_routes import stt_router
from src.api.speaker_routes import speaker_router
from src.api.iot_routes import iot_router
from src.api.utils import initialize_nlp, _nlp_module, _hotword_module, _serial_manager, _mqtt_client
from .db.database import Base, engine
from .db import models  # Importa los modelos para asegurar que estén registrados con Base
from src.ai.hotword.hotword import HotwordDetector
from src.ai.nlp.nlp_core import NLPModule
import httpx
import json
import pyaudio
import wave
from datetime import datetime
import numpy as np

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI(title="Casa Inteligente API")

# Instancias globales
hotword_detector: HotwordDetector = None
nlp_module: NLPModule = None

# Instancias globales (ahora se obtienen de utils)
hotword_detector = _hotword_module
nlp_module = _nlp_module

# Configuración
CONFIG_PATH = "src/ai/config/config.json"

def load_config():
    load_dotenv()  # Cargar variables de entorno del archivo .env
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            config = json.load(f)
    except FileNotFoundError:
        # Crear configuración por defecto
        config = {
            "assistant_name": "Murph",
            "owner_name": "Gre",
            "language": "es",
            "capabilities": ["control_luces", "control_temperatura", "control_dispositivos", "consulta_estado"],
            "model": {
                "name": "mistral:7b-instruct",
                "temperature": 0.7,
                "max_tokens": 150
            },
            "memory_size": 10
        }
        # Crear directorio si no existe
        os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4, ensure_ascii=False)
    
    return config



@app.on_event("startup")
async def startup_event():
    """Evento de inicio de la aplicación."""
    global hotword_detector, nlp_module
    
    logging.info("Iniciando aplicación Casa Inteligente...")
    
    try:
        # Cargar variables de entorno
        load_dotenv()
        
        # Cargar configuración
        config = load_config()
        logging.info(f"Configuración cargada: {config}")
        
        # Inicializar módulos NLP
        initialize_nlp()

        # Asignar las instancias de IoT a app.state desde los módulos globales de utils.py
        app.state.serial_manager = _serial_manager
        app.state.mqtt_client = _mqtt_client


        # Crear tablas de base de datos
        Base.metadata.create_all(bind=engine)
        
        # Inicializar variables de escucha continua en app.state
        app.state.continuous_listening_task = None
        app.state.stop_continuous_listening_event = asyncio.Event()

        # HotwordDetector se inicializa dentro de initialize_nlp() en utils.py
        # No es necesario inicializarlo aquí directamente.
        # La variable global hotword_detector en main.py ya apunta a _hotword_module de utils.
        if _hotword_module and not _hotword_module.is_online():
            logging.warning("HotwordDetector no está en línea. Verifique PICOVOICE_ACCESS_KEY o HOTWORD_PATH.")

        logging.info("Aplicación iniciada correctamente")
        
    except Exception as e:
        logging.error(f"Error durante el inicio de la aplicación: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Evento de cierre de la aplicación."""
    global hotword_detector
    
    logging.info("Cerrando aplicación...")
    
    try:
        # Detener HotwordDetector
        if hotword_detector:
            try:
                hotword_detector.stop()
                logging.info("HotwordDetector detenido")
            except Exception as e:
                logging.error(f"Error al detener HotwordDetector: {e}")

        # Desconectar SerialManager
        if hasattr(app.state, 'serial_manager') and app.state.serial_manager:
            try:
                app.state.serial_manager.close()
                logging.info("SerialManager desconectado")
            except Exception as e:
                logging.error(f"Error al desconectar SerialManager: {e}")

        # Desconectar MQTTClient
        if hasattr(app.state, 'mqtt_client') and app.state.mqtt_client:
            try:
                app.state.mqtt_client.disconnect()
                logging.info("MQTTClient desconectado")
            except Exception as e:
                logging.error(f"Error al desconectar MQTTClient: {e}")
        
        # Detener escucha continua
        if hasattr(app.state, 'continuous_listening_task') and \
           app.state.continuous_listening_task and \
           not app.state.continuous_listening_task.done():
            
            logging.info("Deteniendo escucha continua...")
            app.state.stop_continuous_listening_event.set()
            
            try:
                await asyncio.wait_for(app.state.continuous_listening_task, timeout=5.0)
                logging.info("Escucha continua detenida correctamente")
            except asyncio.TimeoutError:
                logging.warning("Timeout al detener escucha continua, cancelando tarea...")
                app.state.continuous_listening_task.cancel()
                try:
                    await app.state.continuous_listening_task
                except asyncio.CancelledError:
                    logging.info("Tarea de escucha continua cancelada")
            except Exception as e:
                logging.error(f"Error al detener escucha continua: {e}")
        
        logging.info("Aplicación cerrada correctamente")
        
    except Exception as e:
        logging.error(f"Error durante el cierre de la aplicación: {e}")

# Incluir las rutas de la API
app.include_router(router, prefix="")