import tkinter as tk
from tkinter import messagebox
import threading
import asyncio
import os
import sys

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

    def hotword_callback(self):
        self.log_message("¡Palabra clave detectada! La IA responderá...")
        # Programar la ejecución de ai_response en el bucle de eventos principal
        if self.main_asyncio_loop and self.main_asyncio_loop.is_running():
            asyncio.run_coroutine_threadsafe(self.ai_response(), self.main_asyncio_loop)
        else:
            self.log_message("Error: El bucle de eventos principal de asyncio no está corriendo.")

    async def ai_response(self):
        if self.nlp_module and self.nlp_module.is_online():
            try:
                # Aquí puedes personalizar la respuesta de la IA
                response = await self.nlp_module.generate_response("Saluda")  # Prompt ejemplo
                if response:
                    self.log_message(f"IA: {response}")
                else:
                    self.log_message("IA: No se pudo generar una respuesta.")
            except Exception as e:
                self.log_message(f"Error al obtener respuesta de la IA: {e}")
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
            self.hotword_detector.start(self.hotword_callback)
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
