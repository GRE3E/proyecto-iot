import os
import sys
import tempfile
from pydub import AudioSegment
from pydub.playback import play

# Add the project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.ai.tts.tts_module import TTSModule, MODEL_NAME, SPEAKER

def test_tts_module():
    print("\n--- Iniciando prueba del módulo TTS ---")
    tts_module = None
    try:
        tts_module = TTSModule(model_name=MODEL_NAME, speaker=SPEAKER)

        if tts_module.is_online():
            print("Módulo TTS en línea. Generando audio...")
            test_text = "Hola, este es un mensaje de prueba para el módulo de texto a voz."
            
            # Create a temporary file for the audio output
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmpfile:
                output_path = tmpfile.name

            future_audio_generated = tts_module.generate_speech(test_text, output_path)
            audio_generated = future_audio_generated.result()

            if audio_generated:
                print(f"Audio generado en: {output_path}")
                print("Reproduciendo audio...")
                audio = AudioSegment.from_wav(output_path)
                play(audio)
                print("Reproducción finalizada.")
            else:
                print("Fallo al generar el audio.")
            
            # Clean up the temporary file
            os.remove(output_path)
            print(f"Archivo temporal {output_path} eliminado.")
        else:
            print("Módulo TTS no está en línea. No se puede realizar la prueba.")
    except Exception as e:
        print(f"Ocurrió un error durante la prueba del módulo TTS: {e}")
    finally:
        if tts_module and tts_module.is_online():
            print("Módulo TTS finalizado.")

if __name__ == "__main__":
    test_tts_module()