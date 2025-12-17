# Proyecto IoT - Asistente de Hogar Inteligente

## Descripción

Sistema avanzado de asistente de hogar inteligente que integra múltiples tecnologías de inteligencia artificial para proporcionar una experiencia de automatización del hogar completa y personalizada. El sistema combina procesamiento de lenguaje natural (NLP), reconocimiento de voz (STT), síntesis de voz (TTS), reconocimiento facial, identificación de hablantes y control de dispositivos IoT a través de MQTT.

### Características Principales

- **Reconocimiento de Voz**: Transcripción de audio a texto con Whisper
- **Identificación de Hablantes**: Reconocimiento biométrico de voz para autenticación
- **Procesamiento de Lenguaje Natural**: Comprensión de comandos y conversación contextual con Ollama
- **Síntesis de Voz**: Generación de respuestas en audio con TTS
- **Reconocimiento Facial**: Autenticación y registro mediante reconocimiento facial
- **Detección de Hotword**: Activación por palabra clave personalizada (Picovoice)
- **Control IoT**: Gestión de dispositivos inteligentes vía MQTT
- **Reproductor de Música**: Streaming de audio desde YouTube con yt-dlp
- **Memoria Contextual**: Sistema de aprendizaje de patrones y rutinas
- **Autenticación Multifactor**: JWT, voz, rostro y API keys
- **Sistema de Notificaciones**: Alertas y notificaciones personalizadas
- **WebSocket**: Comunicación en tiempo real
- **Estadísticas de Temperatura**: Monitoreo y registro de sensores

---

## Requisitos del Sistema

### Software Requerido

- **Python**: 3.10 o superior
- **Ollama**: Para el modelo de NLP ([Descargar Ollama](https://ollama.ai/))
- **FFmpeg**: Para procesamiento de audio/video ([Descargar FFmpeg](https://ffmpeg.org/download.html))
- **CMake**: Para compilación de módulos nativos (reconocimiento facial)
- **VLC Media Player**: Para reproducción de música en Windows ([Descargar VLC](https://www.videolan.org/vlc/))

### Hardware Recomendado

- **GPU NVIDIA** (opcional): Para aceleración CUDA en modelos de IA
- **Micrófono**: Para funcionalidades de voz
- **Cámara**: Para reconocimiento facial
- **Broker MQTT**: Para comunicación con dispositivos IoT

### Servicios Externos

- **Picovoice Console**: Para obtener API key y entrenar palabra clave personalizada ([Picovoice Console](https://console.picovoice.ai/))

---

## Instalación

### 1. Clonar el Repositorio

```powershell
git clone <repository-url>
```

### 2. Crear y Activar Entorno Virtual

```powershell
python -m venv .venv
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\.venv\Scripts\Activate.ps1
```

### 3. Instalar Dependencias

```powershell
pip install -r requirements.txt
```

### 4. Instalar PyTorch con Soporte CUDA (Opcional)

Si dispones de GPU NVIDIA con CUDA instalado:

```powershell
# Ajusta cu121 a tu versión de CUDA (ej: cu118 para CUDA 11.8)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 5. Configurar Ollama

Instala y verifica que Ollama esté funcionando con el modelo requerido:

```powershell
ollama list  # Verificar modelos instalados
ollama pull qwen2.5:3b-instruct  # Descargar modelo (si no está instalado)
```

### 6. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto basándote en `example.env`:

```bash
# Hotword Configuration
PICOVOICE_ACCESS_KEY=tu_clave_de_picovoice
HOTWORD_PATH=src/ai/hotword/models/tu_modelo.ppn

# IoT Module Configuration
MQTT_BROKER=localhost
MQTT_PORT=1883

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434

# JWT Configuration
SECRET_KEY_JWT=tu_clave_secreta_muy_segura
ALGORITHM_JWT=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Device Authentication
DEVICE_API_KEY=tu_api_key_para_dispositivos
```

---

## Uso

### Iniciar el Servidor

```powershell
uvicorn src.main:app --reload
```

> **Nota**: El servidor de Ollama se iniciará automáticamente en segundo plano. No es necesario ejecutar `ollama serve` manualmente.

### Acceder a la Aplicación

- **API Base**: `http://127.0.0.1:8000`
- **Documentación Interactiva (Swagger)**: `http://127.0.0.1:8000/docs`

> **Importante**: Para ver todos los endpoints disponibles, sus parámetros, esquemas y probar la API de forma interactiva, visita `/docs`.

---

## Configuración

### Configuración del Modelo NLP

El sistema utiliza `src/ai/nlp/config/config.json` para configurar los parámetros del modelo de Ollama:

```json
{
  "name": "qwen2.5:3b-instruct",
  "temperature": 0.3,
  "top_p": 0.9,
  "top_k": 40,
  "repeat_penalty": 1.1,
  "num_ctx": 8192,
  "max_tokens": 1024
}
```

**Parámetros:**

- `name`: Nombre del modelo de Ollama
- `temperature`: Control de creatividad (0.0 - 1.0)
- `top_p`: Muestreo de tokens por probabilidad acumulada
- `top_k`: Muestreo de los k tokens más probables
- `repeat_penalty`: Penalización por repetición
- `num_ctx`: Tamaño del contexto
- `max_tokens`: Máximo de tokens a generar

### Configuración del Reproductor de Música

El módulo de música se configura en `src/music_manager/config.yml`:

```yaml
music:
  default_volume: 65
  extractor: yt_dlp
  playback: vlc # o mpv
  retry_on_failure: true
  retries: 3
  position_broadcast_interval: 2.0

yt_dlp:
  timeout: 30
  audio_quality: best
  audio_format: bestaudio
```

---

## API y Endpoints

### Documentación Completa

Para explorar todos los endpoints disponibles, sus parámetros, esquemas de request/response y probar la API de forma interactiva:

**Visita: `http://127.0.0.1:8000/docs`**

### Categorías de Endpoints

La API está organizada en las siguientes categorías:

- **Autenticación** (`/auth/*`): Registro, login, tokens JWT, recuperación de contraseña
- **IoT** (`/iot/*`): Control de dispositivos, comandos MQTT, estados de sensores
- **Música** (`/music/*`): Reproducción, control de volumen, cola de reproducción
- **NLP** (`/nlp/*`, `/memory/*`): Procesamiento de lenguaje, historial, rutinas
- **Reconocimiento Facial** (`/rc/*`): Registro, identificación, gestión de usuarios
- **Reconocimiento de Voz** (`/speaker/*`): Registro de voz, identificación de hablantes
- **Hotword** (`/hotword/*`): Procesamiento de audio tras detección de palabra clave
- **STT/TTS** (`/stt/*`, `/tts/*`): Transcripción y síntesis de voz
- **Notificaciones** (`/notifications/*`): Gestión de notificaciones
- **Permisos** (`/permissions/*`): Control de acceso y permisos
- **Addons** (`/addons/*`): Configuración adicional (zona horaria, etc.)
- **WebSocket** (`/ws/{client_id}`): Conexión en tiempo real

---

## Testing

El proyecto incluye tests para verificar el funcionamiento de los módulos principales:

```powershell
# Ejecutar todos los tests
pytest

# Ejecutar tests específicos
pytest src/test/test_nlp_.py
```

### Tests Disponibles

- `test_ai_nlp_stt_hotword.py`: Pipeline completo de voz
- `test_cuda.py`: Verificación de soporte CUDA
- `test_face_pipeline.py`: Pipeline de reconocimiento facial
- `test_face_recognition.py`: Funcionalidades de reconocimiento facial
- `test_iot.py`: Comunicación MQTT y dispositivos IoT
- `test_mqtt_wifi.py`: Conectividad MQTT
- `test_tts.py`: Síntesis de voz

---

## Seguridad

### Autenticación

El sistema soporta múltiples métodos de autenticación:

1. **JWT (JSON Web Tokens)**: Para autenticación estándar de usuarios
2. **API Keys**: Para autenticación de dispositivos
3. **Reconocimiento de Voz**: Autenticación biométrica por voz
4. **Reconocimiento Facial**: Autenticación biométrica por rostro

### Recuperación de Contraseña

- Recuperación mediante verificación de voz
- Recuperación mediante verificación facial

### Roles y Permisos

- **Usuario Propietario** (`is_owner: true`): Acceso completo al sistema
- **Usuario Regular**: Acceso limitado según permisos asignados
- Sistema de permisos granular para control de acceso

---

## WebSocket

El sistema incluye soporte para comunicación en tiempo real mediante WebSocket:

**Endpoint**: `ws://127.0.0.1:8000/ws/{client_id}`

### Eventos en Tiempo Real

- Actualizaciones de estado de música
- Notificaciones del sistema
- Cambios en dispositivos IoT
- Respuestas del asistente

## Base de Datos

El sistema utiliza **SQLite** con **SQLAlchemy** como ORM para gestionar:

- Usuarios y autenticación
- Historial de conversaciones NLP
- Estados de dispositivos IoT
- Comandos IoT
- Rutinas y patrones aprendidos
- Registros de reproducción de música
- Notificaciones
- Permisos y roles
- Estadísticas de temperatura

La base de datos se crea automáticamente al iniciar la aplicación.

---

## Soporte y Documentación

- **Documentación de API**: `http://127.0.0.1:8000/docs`
- **Estado del Sistema**: `http://127.0.0.1:8000/status`

---

## Roadmap

- [ ] Integración con más plataformas de música
- [ ] Soporte para múltiples idiomas
- [ ] Dashboard web para administración
- [ ] Aplicación móvil
- [ ] Integración con más dispositivos IoT
- [ ] Sistema de plugins para extensibilidad
- [ ] Mejoras en el sistema de aprendizaje de rutinas

---

## Licencia

Este proyecto está bajo la licencia especificada en el archivo LICENSE.

---

**Desarrollado para automatización del hogar inteligente**
