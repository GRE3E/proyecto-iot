import pvporcupine
import struct
import pyaudio
import os
import asyncio
import httpx
import wave
from datetime import datetime

class HotwordDetector:
    def __init__(self, access_key, hotword_path, input_device_index=None):
        self.access_key = access_key
        self.hotword_path = hotword_path
        self.input_device_index = input_device_index
        self.porcupine = None
        self.pa = None
        self.audio_stream = None

    def is_online(self) -> bool:
        return self.porcupine is not None and self.pa is not None and self.audio_stream is not None

    def start(self, callback):
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

            print(f"[HotwordDetector] Escuchando palabras clave...")
            while True:
                pcm = self.audio_stream.read(self.porcupine.frame_length)
                pcm = struct.unpack_from("h" * self.porcupine.frame_length, pcm)

                result = self.porcupine.process(pcm)
                if result >= 0:
                    print(f"[HotwordDetector] Palabra activa detectada, activando asistente...")
                    callback()

        except Exception as e:
            print(f"[HotwordDetector] Error: {e}")
        finally:
            self.stop()

    def stop(self):
        if self.audio_stream is not None:
            self.audio_stream.close()
        if self.pa is not None:
            self.pa.terminate()
        if self.porcupine is not None:
            self.porcupine.delete()
        print("\033[92mINFO\033[0m:     [HotwordDetector] Detenido.")

def record_audio(filename, duration=5, sample_rate=16000, chunk_size=1024, channels=1):
    p = pyaudio.PyAudio()
    stream = p.open(format=pyaudio.paInt16,
                    channels=channels,
                    rate=sample_rate,
                    input=True,
                    frames_per_buffer=chunk_size)

    frames = []
    print(f"[HotwordDetector] Grabando durante {duration} segundos...")
    for _ in range(0, int(sample_rate / chunk_size * duration)):
        data = stream.read(chunk_size)
        frames.append(data)

    print("[HotwordDetector] Grabación finalizada.")
    stream.stop_stream()
    stream.close()
    p.terminate()

    wf = wave.open(filename, 'wb')
    wf.setnchannels(channels)
    wf.setsamewidth(p.get_sample_size(pyaudio.paInt16))
    wf.setframerate(sample_rate)
    wf.writeframes(b''.join(frames))
    wf.close()

async def hotword_callback_async():
    print("¡Palabra clave detectada! Activando IA...")
    audio_filename = f"hotword_audio_{datetime.now().strftime('%Y%m%d%H%M%S')}.wav"
    record_audio(audio_filename)

    async with httpx.AsyncClient() as client:
        try:
            with open(audio_filename, "rb") as f:
                files = {'audio_file': (audio_filename, f, 'audio/wav')}
                response = await client.post("http://localhost:8000/hotword/process_audio", files=files)
                response.raise_for_status()
                result = response.json()
                print(f"[HotwordDetector] Respuesta de la API: {result}")
        except httpx.RequestError as e:
            print(f"[HotwordDetector] Falló la solicitud HTTP: {e}")
        except httpx.HTTPStatusError as e:
            print(f"[HotwordDetector] Error de estado HTTP: {e.response.status_code} - {e.response.text}")
        finally:
            os.remove(audio_filename) # Limpiar el archivo de audio

if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()
    ACCESS_KEY = os.getenv("PICOVOICE_ACCESS_KEY")
    HOTWORD_PATH = os.getenv("HOTWORD_PATH")

    if not ACCESS_KEY:
        print("Error: PICOVOICE_ACCESS_KEY no encontrada en las variables de entorno.")
        exit()
    if not HOTWORD_PATH:
        print("Error: HOTWORD_PATH no encontrada en las variables de entorno.")
        exit()

    def hotword_callback_sync():
        asyncio.run(hotword_callback_async())

    detector = HotwordDetector(access_key=ACCESS_KEY, hotword_path=HOTWORD_PATH)
    detector.start(hotword_callback_sync)