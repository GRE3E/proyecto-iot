import os
from dotenv import load_dotenv
from fastapi import FastAPI
from .api.routes import router, initialize_nlp
from .db.database import Base, engine
from .db import models # Importa los modelos para asegurar que estén registrados con Base
from src.ai.hotword.hotword import HotwordDetector
from src.ai.nlp.nlp_core import NLPModule
import asyncio
import httpx
import json
import pyaudio
import wave
from datetime import datetime
import numpy as np

app = FastAPI(title="Casa Inteligente API")

# Instancias globales
hotword_detector: HotwordDetector = None
nlp_module: NLPModule = None

# Configuración
CONFIG_PATH = "src/ai/config/config.json"

def load_config():
    load_dotenv() # Cargar variables de entorno del archivo .env
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    return config

async def continuous_audio_processing_loop():
    print("[Escucha Continua] Iniciando procesamiento de audio continuo...")
    p = pyaudio.PyAudio()
    stream = p.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=16000, # Asumiendo una frecuencia de muestreo de 16kHz para STT
        input=True,
        frames_per_buffer=1024
    )

    while not app.state.stop_continuous_listening_event.is_set():
        try:
            frames = []
            # Grabar un pequeño fragmento de audio (ej. 3 segundos)
            for _ in range(0, int(16000 / 1024 * 3)): # 3 segundos de audio
                data = stream.read(1024)
                frames.append(data)
            
            audio_filename = f"continuous_audio_{datetime.now().strftime('%Y%m%d%H%M%S')}.wav"
            wf = wave.open(audio_filename, 'wb')
            wf.setnchannels(1)
            wf.setsamewidth(p.get_sample_size(pyaudio.paInt16))
            wf.setframerate(16000)
            wf.writeframes(b''.join(frames))
            wf.close()

            async with httpx.AsyncClient() as client:
                try:
                    with open(audio_filename, "rb") as f:
                        files = {'audio_file': (audio_filename, f, 'audio/wav')}
                        response = await client.post("http://localhost:8000/hotword/process_audio", files=files)
                        response.raise_for_status()
                        result = response.json()
                        print(f"[Escucha Continua] Respuesta de la API: {result}")
                except httpx.RequestError as e:
                    print(f"[Escucha Continua] Falló la solicitud HTTP: {e}")
                except httpx.HTTPStatusError as e:
                    print(f"[Escucha Continua] Error de estado HTTP: {e.response.status_code} - {e.response.text}")
                finally:
                    os.remove(audio_filename) # Limpiar el archivo de audio
            
            await asyncio.sleep(0.1) # Pequeño retraso para evitar el busy-waiting

        except Exception as e:
            print(f"[Escucha Continua] Error: {e}")
            break

    stream.stop_stream()
    stream.close()
    p.terminate()
    print("[Escucha Continua] Procesamiento de audio continuo detenido.")

@app.on_event("startup")
async def startup_event():
    global hotword_detector, nlp_module
    load_dotenv()
    initialize_nlp()
    Base.metadata.create_all(bind=engine)
    
    # Inicializar variables de escucha continua en app.state
    app.state.continuous_listening_task = None
    app.state.stop_continuous_listening_event = asyncio.Event()

    # Inicializar HotwordDetector
    access_key = os.getenv("PICOVOICE_ACCESS_KEY")
    hotword_path = os.getenv("HOTWORD_PATH")
    if access_key and hotword_path:
        hotword_detector = HotwordDetector(access_key=access_key, hotword_path=hotword_path)
        # asyncio.create_task(start_hotword_detection_loop()) # Detección de hotword automática eliminada al inicio
    else:
        print("PICOVOICE_ACCESS_KEY o HOTWORD_PATH no configurados en .env. La detección de hotword no estará activa.")

@app.on_event("shutdown")
async def shutdown_event():
    global hotword_detector
    if hotword_detector:
        hotword_detector.stop()
    if app.state.continuous_listening_task and not app.state.continuous_listening_task.done():
        app.state.stop_continuous_listening_event.set()
        try:
            await asyncio.wait_for(app.state.continuous_listening_task, timeout=5.0)
        except asyncio.TimeoutError:
            app.state.continuous_listening_task.cancel()
            print("[Apagado] Tarea de escucha continua cancelada debido a tiempo de espera.")
    print("\033[92mINFO\033[0m:     Aplicación apagada.")

# Incluye las rutas de la API
app.include_router(router, prefix="")