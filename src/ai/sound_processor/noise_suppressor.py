import noisereduce as nr
import soundfile as sf
import numpy as np
import os
import logging
import uuid

logger = logging.getLogger("NoiseSuppressor")

def suppress_noise(audio_path: str, sr: int = 16000) -> str:
    """
    Aplica supresión de ruido a un archivo de audio.

    Args:
        audio_path (str): La ruta al archivo de audio de entrada.
        sr (int): La frecuencia de muestreo esperada del audio.

    Returns:
        str: La ruta al archivo de audio temporal con el ruido suprimido.
             Retorna None si ocurre un error.
    """
    try:
        # Cargar el audio
        audio, current_sr = sf.read(audio_path)

        # Si el audio es estéreo, convertir a mono promediando los canales
        if audio.ndim > 1:
            audio = audio.mean(axis=1)

        # Asegurarse de que el audio sea float32
        audio = audio.astype(np.float32)

        segment_for_noise_estimation = int(0.5 * current_sr)
        if len(audio) < segment_for_noise_estimation:
            logger.warning(f"Audio demasiado corto para estimar ruido de los primeros 0.5s. Usando todo el audio para estimación de ruido en {audio_path}.")
            reduced_noise = nr.reduce_noise(y=audio, sr=current_sr, n_fft=2048, hop_length=512, win_length=2048)
        else:
            reduced_noise = nr.reduce_noise(y=audio, sr=current_sr, n_fft=2048, hop_length=512, win_length=2048,
                                            prop_decrease=1.0, # Reducir todo el ruido posible
                                            stationary=False, # El ruido puede no ser estacionario
                                            chunk_size=1024, # Procesar en chunks para eficiencia
                                            n_jobs=1, # Usar un solo core para evitar problemas de paralelismo
                                            time_constant_s=2.0, # Constante de tiempo para adaptación
                                            freq_mask_smooth_hz=500, # Suavizado de máscara de frecuencia
                                            use_tqdm=False, # No usar tqdm para evitar dependencias de UI
                                            # Estimación de ruido del inicio del audio
                                            y_noise=audio[0:segment_for_noise_estimation])

        # Crear un nombre de archivo temporal único
        temp_dir = "temp_audio"
        os.makedirs(temp_dir, exist_ok=True)
        temp_audio_path = os.path.join(temp_dir, f"denoised_audio_{uuid.uuid4().hex}.wav")

        # Guardar el audio procesado en un archivo temporal
        sf.write(temp_audio_path, reduced_noise, current_sr)
        logger.info(f"Ruido suprimido para {audio_path}. Archivo temporal guardado en {temp_audio_path}")
        return temp_audio_path
    except Exception as e:
        logger.error(f"Error al aplicar supresión de ruido a {audio_path}: {e}")
        return None

if __name__ == "__main__":
    # Ejemplo de uso (requiere un archivo de audio de prueba)
    # Crea un archivo de audio de prueba con ruido si no existe
    if not os.path.exists("test_noise.wav"):
        print("Creando archivo de audio de prueba con ruido...")
        duration = 5  # segundos
        samplerate = 16000  # Hz
        frequency = 440  # Hz (tono)
        t = np.linspace(0., duration, int(samplerate * duration), endpoint=False)
        # Tono puro
        pure_tone = 0.5 * np.sin(2 * np.pi * frequency * t)
        # Ruido blanco
        noise = 0.1 * np.random.randn(len(t))
        # Combinar tono y ruido
        noisy_audio = pure_tone + noise
        sf.write("test_noise.wav", noisy_audio, samplerate)
        print("Archivo 'test_noise.wav' creado.")

    input_audio = "test_noise.wav"
    if os.path.exists(input_audio):
        print(f"Aplicando supresión de ruido a {input_audio}...")
        denoised_file = suppress_noise(input_audio)
        if denoised_file:
            print(f"Audio con ruido suprimido guardado en: {denoised_file}")
            # Puedes reproducir o inspeccionar el archivo denoised_file
            # Para limpiar: os.remove(denoised_file)
        else:
            print("Fallo la supresión de ruido.")
    else:
        print(f"El archivo de audio de prueba '{input_audio}' no existe. Por favor, créalo o proporciona uno válido.")
