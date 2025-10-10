# Proyecto IoT - Asistente de Hogar Inteligente

## Descripción

Este proyecto es un asistente de hogar inteligente avanzado, diseñado para interactuar de manera eficiente y segura con el usuario para controlar dispositivos IoT, ejecutar comandos específicos y proporcionar información relevante sobre el entorno del hogar. Utiliza procesamiento de lenguaje natural (NLP), reconocimiento de voz (STT y Speaker Recognition), síntesis de voz (TTS), detección de hotword y comunicación con dispositivos IoT a través de MQTT.

## Requisitos (actualizar)

- Python 3.10 o superior
- Ollama instalado con el modelo (para NLP)
- Dependencias listadas en `requirements.txt`
- Modelos de Whisper (se descargarán automáticamente al usar el módulo STT)
- Picovoice Console para obtener una clave de acceso y entrenar una palabra clave personalizada.
- Configuración de MQTT para la comunicación con dispositivos IoT.

## Instalación

1.  **Crear y activar entorno virtual:**

    ```powershell
    python -m venv .venv
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process; ./.venv/Scripts/Activate.ps1
    ```

2.  **Instalar dependencias:**

    ```powershell
    pip install -r requirements.txt
    ```

3.  **Instalar PyTorch con soporte para CUDA (si se dispone de GPU NVIDIA):**
    Asegúrate de tener el CUDA Toolkit de NVIDIA instalado en tu sistema. Luego, instala PyTorch con el siguiente comando (ajusta `cu121` a la versión de CUDA que tengas instalada, por ejemplo, `cu118` para CUDA 11.8):

    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process; ./.venv/Scripts/Activate.ps1; pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    ```

4.  **Asegurarse de tener Ollama instalado y el modelo descargado (para NLP):**

    ```powershell
    ollama list  # Verificar que el modelo está instalado
    ```

5.  **El sistema utiliza la variable de entorno OLLAMA_OPTIONS para configurar los parámetros del modelo de NLP:**

    ```json
    {
        "temperature": 0.7,     # Control de creatividad (0.0 - 1.0)
        "num_predict": 500      # Máximo de tokens a generar
    }
    ```

## Uso

1.  **Iniciar el servidor:**

    ```powershell
    uvicorn src.main:app --reload
    ```

    **Nota:** El servidor de Ollama se iniciará automáticamente en segundo plano cuando la aplicación se inicie. No es necesario ejecutar `ollama serve` manualmente.

2.  **El servidor estará disponible en:**

    - API: `http://127.0.0.1:8000`
    - Documentación: `http://127.0.0.1:8000/docs`

## Endpoints

Los endpoints de la API están definidos en el directorio `src/api/` y se agrupan por funcionalidad. Puedes explorar la documentación interactiva en `http://127.0.0.1:8000/docs` para ver todos los endpoints disponibles y sus esquemas.

### GET /status

Verifica el estado actual de los módulos.

Respuesta:

```json
{
  "nlp": "ONLINE",
  "stt": "ONLINE",
  "speaker": "ONLINE",
  "hotword": "ONLINE",
  "mqtt": "ONLINE",
  "tts": "ONLINE",
  "utils": "ONLINE"
}
```

### POST /hotword/process_audio

Procesa el audio tras la detección de hotword: STT (voz a texto), Identificación de hablante, Procesamiento NLP y Generación TTS.

Cuerpo de la solicitud:

```
audio_file: UploadFile
```

Respuesta:

```json
{
  "transcribed_text": "string",
  "identified_speaker": "string",
  "nlp_response": "string",
  "tts_audio_file_path": "string"
}
```

### POST /tts/generate_audio

Genera un archivo de audio a partir de texto usando el módulo TTS.

Cuerpo de la solicitud:

```json
{
  "text": "string"
}
```

Respuesta:

```json
{
  "audio_file_path": "string"
}
```

### POST /nlp/query

Procesa una consulta NLP y devuelve la respuesta generada.

Cuerpo de la solicitud:

```json
{
  "prompt": "string",
  "user_id": 0
}
```

Respuesta:

```json
{
  "response": "string",
  "preference_key": "string",
  "preference_value": "string"
}
```

### PUT /config/assistant-name

Actualiza el nombre del asistente en la configuración.

Cuerpo de la solicitud:

```json
{
  "name": "string"
}
```

Respuesta:

```json
{
  "nlp": "ONLINE",
  "stt": "ONLINE",
  "speaker": "ONLINE",
  "hotword": "ONLINE",
  "mqtt": "ONLINE",
  "tts": "ONLINE",
  "utils": "ONLINE"
}
```

### PUT /config/capabilities

Actualiza las capacidades del asistente en la configuración.

Cuerpo de la solicitud:

```json
{
  "capabilities": ["string"]
}
```

Respuesta:

```json
{
  "nlp": "ONLINE",
  "stt": "ONLINE",
  "speaker": "ONLINE",
  "hotword": "ONLINE",
  "mqtt": "ONLINE",
  "tts": "ONLINE",
  "utils": "ONLINE"
}
```

### POST /stt/transcribe

Convierte voz a texto usando el módulo STT.

Cuerpo de la solicitud:

```
audio_file: UploadFile
```

Respuesta:

```json
{
  "text": "string"
}
```

### POST /speaker/register

Registra un nuevo usuario con su voz.

Cuerpo de la solicitud:

```
name: str (Form)
audio_file: UploadFile (File)
is_owner: bool (Form)
```

Respuesta:

```json
{
  "nlp": "ONLINE",
  "stt": "ONLINE",
  "speaker": "ONLINE",
  "hotword": "ONLINE",
  "mqtt": "ONLINE",
  "tts": "ONLINE",
  "utils": "ONLINE"
}
```

### POST /speaker/register_owner

Registra un nuevo usuario como propietario con su voz.

Cuerpo de la solicitud:

```
name: str (Form)
audio_file: UploadFile (File)
```

Respuesta:

```json
{
  "nlp": "ONLINE",
  "stt": "ONLINE",
  "speaker": "ONLINE",
  "hotword": "ONLINE",
  "mqtt": "ONLINE",
  "tts": "ONLINE",
  "utils": "ONLINE"
}
```

### POST /speaker/identify

Identifica quién habla.

Cuerpo de la solicitud:

```
audio_file: UploadFile (File)
```

Respuesta:

```json
{
  "speaker_name": "string",
  "user_id": 0,
  "is_owner": true
}
```

### GET /speaker/users

Obtiene la lista de todos los usuarios registrados y sus características.

Respuesta:

```json
{
  "user_count": 0,
  "users": [
    {
      "id": 0,
      "name": "string",
      "is_owner": true
    }
  ]
}
```

### PUT /speaker/update_owner

Actualiza el estado de propietario de un usuario registrado.

Cuerpo de la solicitud:

```json
{
  "user_id": 0,
  "is_owner": true
}
```

Respuesta:

```json
{
  "nlp": "ONLINE",
  "stt": "ONLINE",
  "speaker": "ONLINE",
  "hotword": "ONLINE",
  "mqtt": "ONLINE",
  "tts": "ONLINE",
  "utils": "ONLINE"
}
```

### GET /iot/dashboard_data

Obtiene los datos actuales del dashboard IoT, incluyendo estados de dispositivos y lecturas de sensores.

Respuesta:

```json
{
  "data": {}
}
```

### POST /iot/commands

Crea nuevos comandos IoT.

Cuerpo de la solicitud:

```json
[
  {
    "name": "string",
    "description": "string",
    "command_type": "string",
    "command_payload": "string",
    "mqtt_topic": "string"
  }
]
```

Respuesta:

```json
[
  {
    "id": 0,
    "name": "string",
    "description": "string",
    "command_type": "string",
    "command_payload": "string",
    "mqtt_topic": "string"
  }
]
```

### GET /iot/commands

Lee comandos IoT.

Parámetros de consulta:

```
skip: int = 0
limit: int = 100
```

Respuesta:

```json
[
  {
    "id": 0,
    "name": "string",
    "description": "string",
    "command_type": "string",
    "command_payload": "string",
    "mqtt_topic": "string"
  }
]
```

### GET /iot/commands/{command_id}

Lee un comando IoT específico por ID.

Parámetro de ruta:

```
command_id: int
```

Respuesta:

```json
{
  "id": 0,
  "name": "string",
  "description": "string",
  "command_type": "string",
  "command_payload": "string",
  "mqtt_topic": "string"
}
```

### PUT /iot/commands/{command_id}

Actualiza un comando IoT específico por ID.

Parámetro de ruta:

```
command_id: int
```

Cuerpo de la solicitud:

```json
{
  "name": "string",
  "description": "string",
  "command_type": "string",
  "command_payload": "string",
  "mqtt_topic": "string"
}
```

Respuesta:

```json
{
  "id": 0,
  "name": "string",
  "description": "string",
  "command_type": "string",
  "command_payload": "string",
  "mqtt_topic": "string"
}
```

### DELETE /iot/commands/{command_id}

Elimina un comando IoT específico por ID.

Parámetro de ruta:

```
command_id: int
```

Respuesta:

```
204 No Content
```

### PUT /addons/timezone

Actualiza la zona horaria de la configuración del asistente.

Cuerpo de la solicitud:

```json
{
  "timezone": "string"
}
```

Respuesta:

```json
{
  "message": "Zona horaria actualizada a {timezone}"
}
```

### POST /permissions/

Crea un nuevo permiso.

Cuerpo de la solicitud:

```json
{
  "name": "string"
}
```

Respuesta:

```json
{
  "id": 0,
  "name": "string"
}
```

### GET /permissions/

Obtiene la lista de todos los permisos.

Parámetros de consulta:

```
skip: int = 0
limit: int = 100
```

Respuesta:

```json
[
  {
    "id": 0,
    "name": "string"
  }
]
```

### POST /users/{user_id}/permissions/

Asigna un permiso a un usuario.

Parámetro de ruta:

```
user_id: int
```

Cuerpo de la solicitud:

```
permission_id: int
```

Respuesta:

```json
{
  "user_id": 0,
  "permission_id": 0
}
```

### GET /users/{user_id}/permissions/check/{permission_name}

Verifica si un usuario tiene un permiso específico.

Parámetros de ruta:

```
user_id: int
permission_name: str
```

Respuesta:

```json
true
```

### DELETE /users/{user_id}/permissions/

Elimina un permiso de un usuario.

Parámetros de ruta:

```
user_id: int
permission_id: int
```

Respuesta:

```
204 No Content
```

## Estructura del Proyecto

```
.
├── .gitignore
├── example.env
├── requirements.txt
├── README.md
└── src/
    ├── __init__.py
    ├── ai/
    │   ├── __init__.py
    │   ├── config/
    │   │   └── config.json
    │   ├── hotword/
    │   │   ├── __init__.py
    │   │   ├── hotword.py
    │   │   └── models/
    │   ├── nlp/
    │   │   ├── __init__.py
    │   │   ├── config_manager.py
    │   │   ├── iot_command_processor.py
    │   │   ├── memory_manager.py
    │   │   ├── nlp_core.py
    │   │   ├── ollama_manager.py
    │   │   ├── system_prompt.py
    │   │   └── user_manager.py
    │   ├── speaker/
    │   │   ├── __init__.py
    │   │   └── speaker.py
    │   ├── stt/
    │   │   ├── __init__.py
    │   │   └── stt.py
    │   ├── tts/
    │   │   ├── __init__.py
    │   │   ├── text_splitter.py
    │   │   └── tts_module.py
    │   │   └── generated_audio/
    │   └── utils/
    ├── api/
    │   ├── __init__.py
    │   ├── addons_routes.py
    │   ├── addons_schemas.py
    │   ├── hotword_routes.py
    │   ├── hotword_schemas.py
    │   ├── iot_routes.py
    │   ├── iot_schemas.py
    │   ├── nlp_routes.py
    │   ├── nlp_schemas.py
    │   ├── permissions_routes.py
    │   ├── permissions_schemas.py
    │   ├── routes.py
    │   ├── schemas.py
    │   ├── speaker_routes.py
    │   ├── speaker_schemas.py
    │   ├── stt_routes.py
    │   ├── stt_schemas.py
    │   ├── tts_routes.py
    │   ├── tts_schemas.py
    │   └── utils.py
    ├── db/
    │   ├── database.py
    │   └── models.py
    ├── iot/
    │   ├── __init__.py
    │   ├── arduino_code/
    │   │   ├── Esclavo1.txt
    │   │   ├── Esclavo2.txt
    │   │   ├── Esclavo3.txt
    │   │   └── Master.txt
    │   ├── devices.py
    │   └── mqtt_client.py
    ├── main.py
    ├── test/
    │   ├── test_ai_nlp_stt_hotword.py
    │   ├── test_ai_nlp_stt_hotword_response.py
    │   ├── test_cuda.py
    │   ├── test_iot.py
    │   └── test_tts.py
    └── utils/
        ├── __init__.py
        ├── datetime_utils.py
        └── logger_config.py
```

## Configuración de Hotword

La detección de hotword se configura a través de variables de entorno:

- `PICOVOICE_ACCESS_KEY`: Clave de acceso de Picovoice para la detección de hotword.
- `HOTWORD_PATH`: Ruta al archivo de modelo de hotword (`.ppn`).

## Configuración del Módulo IoT

El módulo IoT se configura a través de variables de entorno en el archivo `.env`:

- `MQTT_BROKER`: Dirección del broker MQTT (ej. `localhost`).
- `MQTT_PORT`: Puerto del broker MQTT (ej. `1883`).

Ejemplo de `.env`:

```
PICOVOICE_ACCESS_KEY=YOUR_PICOVOICE_ACCESS_KEY
HOTWORD_PATH=src/ai/hotword/models/model.ppn

# IoT Module Configuration
MQTT_BROKER=localhost
MQTT_PORT=1883
```
