from fastapi import APIRouter, HTTPException, Request
from src.api.iot_schemas import ContinuousListeningToggle, ContinuousListeningResponse
import logging
import asyncio
import pyaudio
import wave
import httpx
import os
from datetime import datetime
from pathlib import Path
import tempfile

# Importar módulos globales desde utils
from src.api import utils

iot_router = APIRouter()

async def continuous_audio_processing_loop():
    """Bucle de procesamiento de audio continuo."""
    from fastapi import FastAPI
    app = FastAPI.current()  # Instancia actual de FastAPI
    
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
                await asyncio.sleep(1)

        stream.stop_stream()
        stream.close()
        p.terminate()
        logging.info("[Escucha Continua] Procesamiento de audio continuo detenido.")
        
    except Exception as e:
        logging.error(f"[Escucha Continua] Error crítico: {e}")
    finally:
        logging.info("[Escucha Continua] Finalizando bucle de audio.")

@iot_router.post("/continuous_listening", response_model=ContinuousListeningResponse)
async def toggle_continuous_listening(request: ContinuousListeningToggle):
    """Controla la escucha continua (iniciar/detener)."""
    try:
        from fastapi import FastAPI
        app = FastAPI.current()

        if request.action == "start":
            if not hasattr(app.state, "continuous_listening_task") or app.state.continuous_listening_task.done():
                app.state.stop_continuous_listening_event = asyncio.Event()
                app.state.continuous_listening_task = asyncio.create_task(continuous_audio_processing_loop())
                logging.info("Escucha continua iniciada.")
                return ContinuousListeningResponse(status="success", message="Escucha continua iniciada.")
            else:
                return ContinuousListeningResponse(status="info", message="La escucha continua ya está en ejecución.")
        elif request.action == "stop":
            if hasattr(app.state, "stop_continuous_listening_event"):
                app.state.stop_continuous_listening_event.set()
                await app.state.continuous_listening_task
                del app.state.continuous_listening_task
                del app.state.stop_continuous_listening_event
                logging.info("Escucha continua detenida.")
                return ContinuousListeningResponse(status="success", message="Escucha continua detenida.")
            else:
                return ContinuousListeningResponse(status="info", message="La escucha continua no está en ejecución.")
        else:
            raise HTTPException(status_code=400, detail="Acción no válida. Use 'start' o 'stop'.")
    except Exception as e:
        logging.error(f"Error al controlar la escucha continua: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")