import tkinter as tk
from tkinter import messagebox
import threading
import asyncio
import os
import sys
import httpx
import tempfile
from pathlib import Path
import pyaudio
import wave
from datetime import datetime

# Añadir el directorio raíz del proyecto al PATH para las importaciones
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.ai.hotword.hotword import HotwordDetector
from src.ai.nlp.nlp_core import NLPModule
from dotenv import load_dotenv


class MicrophoneApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Control de Micrófono y Hotword")

        self.is_listening = False
        self.hotword_detector = None
        self.nlp_module = None
        self.hotword_thread = None
        self.main_asyncio_loop = None  # Para almacenar el bucle de eventos principal de asyncio

        load_dotenv()  # Cargar variables de entorno
        self.access_key = os.getenv("PICOVOICE_ACCESS_KEY")
        self.hotword_path = os.getenv("HOTWORD_PATH")

        if not self.access_key or not self.hotword_path:
            messagebox.showerror("Error de Configuración", "PICOVOICE_ACCESS_KEY o HOTWORD_PATH no configurados en .env")
            root.destroy()
            return

        self.create_widgets()
        self.initialize_nlp_module()

    def create_widgets(self):
        self.status_label = tk.Label(self.root, text="Micrófono: Desactivado", font=("Arial", 14))
        self.status_label.pack(pady=20)

        self.activate_button = tk.Button(self.root, text="Activar Micrófono", command=self.activate_microphone, font=("Arial", 12))
        self.activate_button.pack(pady=10)

        self.deactivate_button = tk.Button(
            self.root, text="Desactivar Micrófono", command=self.deactivate_microphone,
            font=("Arial", 12), state=tk.DISABLED
        )
        self.deactivate_button.pack(pady=10)

        self.log_text = tk.Text(self.root, height=10, width=50, state=tk.DISABLED)
        self.log_text.pack(pady=10)

    def log_message(self, message):
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, f"{message}\n")
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)

    def initialize_nlp_module(self):
        try:
            self.nlp_module = NLPModule()
            if self.nlp_module.is_online():
                self.log_message("Módulo NLP inicializado y en línea.")
            else:
                self.log_message("Módulo NLP inicializado pero fuera de línea.")
        except Exception as e:
            self.log_message(f"Error al inicializar módulo NLP: {e}")
            messagebox.showerror("Error", f"No se pudo inicializar el módulo NLP: {e}")

    async def hotword_callback(self):
        self.log_message("¡Palabra clave detectada! La IA responderá...")
        if self.nlp_module and self.nlp_module.is_online():
            await self.ai_response()
        else:
            self.log_message("Módulo NLP no disponible para responder en hotword_callback.")
            await asyncio.sleep(0) # Asegura que la función siempre devuelva un awaitable

    def _record_user_prompt_audio(self, sample_rate=16000, chunk_size=320, channels=1, silence_timeout=1.0, vad_aggressiveness=3):
        import webrtcvad

        p = pyaudio.PyAudio()
        stream = p.open(format=pyaudio.paInt16,
                        channels=channels,
                        rate=sample_rate,
                        input=True,
                        frames_per_buffer=chunk_size)

        vad = webrtcvad.Vad(vad_aggressiveness)
        frames = []
        silent_frames = 0
        max_silent_frames = int(silence_timeout * sample_rate / chunk_size)

        self.log_message("[Micrófono] Grabando tu petición... Habla ahora.")

        while True:
            data = stream.read(chunk_size)
            frames.append(data)

            is_speech = vad.is_speech(data, sample_rate)

            if is_speech:
                silent_frames = 0
            else:
                silent_frames += 1

            if silent_frames > max_silent_frames:
                self.log_message("[Micrófono] Silencio detectado, finalizando grabación.")
                break

        stream.stop_stream()
        stream.close()
        p.terminate()

        temp_dir = tempfile.gettempdir()
        audio_filename = Path(temp_dir) / f"user_prompt_audio_{datetime.now().strftime('%Y%m%d%H%M%S')}.wav"

        wf = wave.open(str(audio_filename), 'wb')
        wf.setnchannels(channels)
        wf.setsampwidth(p.get_sample_size(pyaudio.paInt16))
        wf.setframerate(sample_rate)
        wf.writeframes(b''.join(frames))
        wf.close()
        
        return audio_filename

    async def ai_response(self):
        if self.nlp_module and self.nlp_module.is_online():
            self.log_message("Preparando para escuchar tu petición...")
            audio_file_path = None
            try:
                # 1. Grabar la petición del usuario
                audio_file_path = await asyncio.to_thread(self._record_user_prompt_audio, silence_timeout=2.0) # Ejecutar la grabación de audio bloqueante en un hilo

                # 2. Enviar el audio a la API para procesamiento completo (STT, Speaker ID, NLP)
                async with httpx.AsyncClient(timeout=30.0) as client:
                    with open(audio_file_path, "rb") as f:
                        files = {'audio_file': (audio_file_path.name, f, 'audio/wav')}
                        response = await client.post("http://localhost:8000/hotword/hotword/process_audio", files=files)
                        response.raise_for_status() # Lanzar una excepción para códigos de estado erróneos
                        
                        result = response.json()
                        transcribed_text = result.get("transcribed_text", "No se pudo transcribir.")
                        identified_speaker = result.get("identified_speaker", "Desconocido")
                        nlp_response = result.get("nlp_response", "No se pudo generar respuesta NLP.")

                        self.log_message(f"Texto Transcrito: {transcribed_text}")
                        self.log_message(f"Hablante Identificado: {identified_speaker}")
                        self.log_message(f"IA: {nlp_response}")

            except httpx.RequestError as e:
                self.log_message(f"Error en la solicitud HTTP a la API: {e.__class__.__name__}: {e}")
            except httpx.HTTPStatusError as e:
                self.log_message(f"Error de estado HTTP de la API: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                self.log_message(f"Error al obtener respuesta de la IA: {e}")
            finally:
                if audio_file_path and os.path.exists(audio_file_path):
                    os.remove(audio_file_path) # Limpiar el archivo de audio temporal
        else:
            self.log_message("Módulo NLP no disponible para responder.")

    def activate_microphone(self):
        if not self.is_listening:
            self.log_message("Activando micrófono y detección de hotword...")
            self.status_label.config(text="Micrófono: Activado (Escuchando Hotword)")
            self.activate_button.config(state=tk.DISABLED)
            self.deactivate_button.config(state=tk.NORMAL)
            self.is_listening = True

            # Iniciar el detector de hotword en un hilo separado
            self.hotword_thread = threading.Thread(target=self._run_hotword_detector)
            self.hotword_thread.daemon = True  # Permite que el programa se cierre aunque el hilo esté corriendo
            self.hotword_thread.start()

    def _run_hotword_detector(self):
        try:
            self.hotword_detector = HotwordDetector(access_key=self.access_key, hotword_path=self.hotword_path)
            # Crear un nuevo bucle de eventos para este hilo
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.hotword_detector.start(self.hotword_callback))
        except Exception as e:
            self.log_message(f"Error en el detector de hotword: {e}")
            self.root.after(0, self.deactivate_microphone)  # Desactivar en el hilo principal

    def deactivate_microphone(self):
        if self.is_listening:
            self.log_message("Desactivando micrófono y detección de hotword...")
            self.status_label.config(text="Micrófono: Desactivado")
            self.activate_button.config(state=tk.NORMAL)
            self.deactivate_button.config(state=tk.DISABLED)
            self.is_listening = False

            if self.hotword_detector:
                self.hotword_detector.stop()
                self.hotword_detector = None

            if self.hotword_thread and self.hotword_thread.is_alive():
                # La detención del detector de hotword debería eventualmente liberar el hilo
                pass

    def on_closing(self):
        self.deactivate_microphone()
        self.root.destroy()


if __name__ == "__main__":
    # Configurar la política de bucle de eventos para Windows si es necesario
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    # Crear un nuevo bucle de eventos explícitamente (evita DeprecationWarning)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    root = tk.Tk()
    app = MicrophoneApp(root)
    app.main_asyncio_loop = loop  # Almacenar el bucle de eventos principal en la instancia de la aplicación

    root.protocol("WM_DELETE_WINDOW", app.on_closing)

    # Función para ejecutar el bucle de asyncio en un hilo separado
    def run_asyncio_loop_in_thread(loop):
        loop.run_forever()

    # Iniciar el bucle de asyncio en un hilo separado
    asyncio_thread = threading.Thread(target=run_asyncio_loop_in_thread, args=(loop,))
    asyncio_thread.daemon = True  # El hilo se cerrará cuando el programa principal termine
    asyncio_thread.start()

    root.mainloop()
