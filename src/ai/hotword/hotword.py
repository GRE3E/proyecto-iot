import pvporcupine
import struct
import pyaudio
import os
import asyncio
import httpx
import wave
from datetime import datetime
import threading
import webrtcvad
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

class HotwordDetector:
    def __init__(self, access_key, hotword_path, input_device_index=None):
        self.access_key = access_key
        self.hotword_path = hotword_path
        self.input_device_index = input_device_index
        self.porcupine = None
        self.pa = None
        self.audio_stream = None
        self._is_listening = False
        self._callback = None

    def is_online(self) -> bool:
        return self.porcupine is not None and self.pa is not None and self.audio_stream is not None and self._is_listening

    async def start(self, callback):
        self._callback = callback
        try:
            self.porcupine = pvporcupine.create(
                access_key=self.access_key,
                keyword_paths=[self.hotword_path]
            )

            self.pa = pyaudio.PyAudio()
            self.audio_stream = self.pa.open(
                rate=self.porcupine.sample_rate,
                channels=1,
                format=pyaudio.paInt16,
                input=True,
                frames_per_buffer=self.porcupine.frame_length,
                input_device_index=self.input_device_index
            )
            self._is_listening = True
            logging.info("[HotwordDetector] Escuchando palabras clave...")

            while self._is_listening:
                # Ejecutar operaciones de audio y procesamiento en un hilo separado
                pcm = await asyncio.to_thread(self.audio_stream.read, self.porcupine.frame_length)
                pcm = await asyncio.to_thread(struct.unpack_from, "h" * self.porcupine.frame_length, pcm)

                result = await asyncio.to_thread(self.porcupine.process, pcm)
                if result >= 0:
                    logging.info("[HotwordDetector] Palabra activa detectada, activando asistente...")
                    await self._callback()
                await asyncio.sleep(0.01) # Pequeña pausa para no bloquear el bucle de eventos

        except asyncio.CancelledError:
            logging.info("[HotwordDetector] Tarea de escucha cancelada.")
        except Exception as e:
            logging.error(f"[HotwordDetector] Error: {e}")
        finally:
            self.stop()

    def stop(self):
        self._is_listening = False
        if self.audio_stream is not None:
            self.audio_stream.close()
            self.audio_stream = None
        if self.pa is not None:
            self.pa.terminate()
            self.pa = None
        if self.porcupine is not None:
            self.porcupine.delete()
            self.porcupine = None
        logging.info("[HotwordDetector] Detenido.")

def record_audio(filename, sample_rate=16000, chunk_size=320, channels=1, silence_timeout=1.0, vad_aggressiveness=3):
    """
    Graba audio hasta que se detecta silencio.
    
    Args:
        filename: Nombre del archivo de salida.
        sample_rate: Tasa de muestreo del audio (Hz).
        chunk_size: Tamaño de cada fragmento de audio.
        channels: Número de canales de audio (1 para mono).
        silence_timeout: Tiempo en segundos de silencio para detener la grabación.
        vad_aggressiveness: Nivel de agresividad del VAD (1-3).
    """
    
    p = pyaudio.PyAudio()
    stream = None
    try:
        stream = p.open(format=pyaudio.paInt16,
                         channels=channels,
                         rate=sample_rate,
                         input=True,
                         frames_per_buffer=chunk_size)
        
        vad = webrtcvad.Vad(vad_aggressiveness)
        frames = []
        silent_frames = 0
        max_silent_frames = int(silence_timeout * sample_rate / chunk_size)
        
        logging.info("[HotwordDetector] Grabando... Habla ahora.")
        
        while True:
            data = stream.read(chunk_size)
            frames.append(data)
            
            # Verificar actividad de voz
            is_speech = vad.is_speech(data, sample_rate)
            
            if is_speech:
                silent_frames = 0
            else:
                silent_frames += 1
                
            if silent_frames > max_silent_frames:
                logging.info("[HotwordDetector] Silencio detectado, finalizando grabación.")
                break
        
        wf = wave.open(filename, 'wb')
        wf.setnchannels(channels)
        wf.setsampwidth(p.get_sample_size(pyaudio.paInt16))
        wf.setframerate(sample_rate)
        wf.writeframes(b''.join(frames))
        wf.close()
    except Exception as e:
        logging.error(f"[HotwordDetector] Error durante la grabación de audio: {e}")
        # Podrías querer relanzar la excepción o manejarla de otra manera
        raise
    finally:
        if stream is not None:
            stream.stop_stream()
            stream.close()
        if p is not None:
            p.terminate()

async def hotword_callback_async():
    logging.info("¡Palabra clave detectada! Activando IA...")
    audio_filename = f"hotword_audio_{datetime.now().strftime('%Y%m%d%H%M%S')}.wav"
    await asyncio.to_thread(record_audio, audio_filename)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            with open(audio_filename, "rb") as f:
                files = {'audio_file': (audio_filename, f, 'audio/wav')}
                response = await client.post("http://localhost:8000/hotword/hotword/process_audio", files=files)
                response.raise_for_status()
                result = response.json()
                logging.info(f"[HotwordDetector] Respuesta de la API: {result}")
        except httpx.RequestError as e:
            logging.error(f"[HotwordDetector] Falló la solicitud HTTP: {e}", exc_info=True)
        except httpx.HTTPStatusError as e:
            logging.error(f"[HotwordDetector] Error de estado HTTP: {e.response.status_code} - {e.response.text}", exc_info=True)
        finally:
            os.remove(audio_filename) # Limpiar el archivo de audio

if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()
    ACCESS_KEY = os.getenv("PICOVOICE_ACCESS_KEY")
    HOTWORD_PATH = os.getenv("HOTWORD_PATH")

    if not ACCESS_KEY:
        logging.error("Error: PICOVOICE_ACCESS_KEY no encontrada en las variables de entorno.")
        exit()
    if not HOTWORD_PATH:
        logging.error("Error: HOTWORD_PATH no encontrada en las variables de entorno.")
        exit()

    async def main_hotword_test():
        detector = HotwordDetector(access_key=ACCESS_KEY, hotword_path=HOTWORD_PATH)
        await detector.start(hotword_callback_async)

    asyncio.run(main_hotword_test())