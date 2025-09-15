import os
import asyncio
import logging

# IMPORTANTE: Configurar la política del bucle de eventos ANTES de cualquier otra importación
if os.name == 'nt':  # Windows
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from dotenv import load_dotenv
from fastapi import FastAPI
from .api.routes import router, initialize_nlp
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

async def continuous_audio_processing_loop():
    """Bucle de procesamiento de audio continuo mejorado."""
    logging.info("[Escucha Continua] Iniciando procesamiento de audio continuo...")
    
    try:
        p = pyaudio.PyAudio()
        stream = p.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=16000,
            input=True,
            frames_per_buffer=1024
        )

        while not app.state.stop_continuous_listening_event.is_set():
            try:
                frames = []
                # Grabar un pequeño fragmento de audio (3 segundos)
                for _ in range(0, int(16000 / 1024 * 3)):
                    if app.state.stop_continuous_listening_event.is_set():
                        break
                    data = stream.read(1024, exception_on_overflow=False)
                    frames.append(data)
                
                if app.state.stop_continuous_listening_event.is_set():
                    break
                
                audio_filename = f"continuous_audio_{datetime.now().strftime('%Y%m%d%H%M%S')}.wav"
                
                try:
                    wf = wave.open(audio_filename, 'wb')
                    wf.setnchannels(1)
                    wf.setsampwidth(p.get_sample_size(pyaudio.paInt16))
                    wf.setframerate(16000)
                    wf.writeframes(b''.join(frames))
                    wf.close()

                    async with httpx.AsyncClient(timeout=30.0) as client:
                        try:
                            with open(audio_filename, "rb") as f:
                                files = {'audio_file': (audio_filename, f, 'audio/wav')}
                                response = await client.post("http://localhost:8000/hotword/process_audio", files=files)
                                response.raise_for_status()
                                result = response.json()
                                logging.info(f"[Escucha Continua] Respuesta de la API: {result}")
                        except httpx.RequestError as e:
                            logging.error(f"[Escucha Continua] Falló la solicitud HTTP: {e}")
                        except httpx.HTTPStatusError as e:
                            logging.error(f"[Escucha Continua] Error de estado HTTP: {e.response.status_code} - {e.response.text}")
                        except Exception as e:
                            logging.error(f"[Escucha Continua] Error en la solicitud: {e}")
                finally:
                    # Limpiar el archivo de audio
                    try:
                        if os.path.exists(audio_filename):
                            os.remove(audio_filename)
                    except Exception as e:
                        logging.warning(f"[Escucha Continua] No se pudo eliminar {audio_filename}: {e}")
                
                # Pequeño retraso para evitar el busy-waiting
                await asyncio.sleep(0.1)

            except Exception as e:
                logging.error(f"[Escucha Continua] Error en el bucle: {e}")
                await asyncio.sleep(1)  # Esperar antes de continuar

        stream.stop_stream()
        stream.close()
        p.terminate()
        logging.info("[Escucha Continua] Procesamiento de audio continuo detenido.")
        
    except Exception as e:
        logging.error(f"[Escucha Continua] Error crítico: {e}")
    finally:
        logging.info("[Escucha Continua] Finalizando bucle de audio.")

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
        
        # Crear tablas de base de datos
        Base.metadata.create_all(bind=engine)
        
        # Inicializar variables de escucha continua en app.state
        app.state.continuous_listening_task = None
        app.state.stop_continuous_listening_event = asyncio.Event()

        # Inicializar HotwordDetector
        access_key = os.getenv("PICOVOICE_ACCESS_KEY")
        hotword_path = os.getenv("HOTWORD_PATH")
        
        if access_key and hotword_path:
            try:
                hotword_detector = HotwordDetector(access_key=access_key, hotword_path=hotword_path)
                logging.info("HotwordDetector inicializado correctamente")
            except Exception as e:
                logging.error(f"Error al inicializar HotwordDetector: {e}")
                hotword_detector = None
        else:
            logging.warning("PICOVOICE_ACCESS_KEY o HOTWORD_PATH no configurados en .env. La detección de hotword no estará activa.")

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