# Proyecto IoT

## Descripción

Este proyecto implementa un servidor FastAPI que integra procesamiento de lenguaje natural (NLP) utilizando el modelo a través de Ollama, Speech-to-Text (STT) con Whisper para transcribir audio a texto, un módulo de identificación de hablantes con resemblyzer, detección de hotword para activar el asistente por voz, y un **módulo de integración IoT para control de dispositivos seriales y MQTT**. El objetivo es interpretar comandos en lenguaje natural y reconocer a los usuarios por su voz para una casa inteligente, permitiendo la interacción con dispositivos IoT.

## Requisitos

- Python 3.10 o superior
- Ollama instalado con el modelo (para NLP)
- Dependencias listadas en requirements.txt
- Modelos de Whisper (se descargarán automáticamente al usar el módulo STT)
- Picovoice Console para obtener una clave de acceso y entrenar una palabra clave personalizada.

## Instalación

1. Crear y activar entorno virtual:

```powershell
python -m venv .venv
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process; ./.venv/Scripts/Activate.ps1
```

2. Instalar dependencias:

```powershell
pip install -r requirements.txt
```

3. Asegurarse de tener Ollama instalado y el modelo descargado (para NLP):

```powershell
ollama list  # Verificar que el modelo está instalado
```

4. El sistema utiliza la variable de entorno OLLAMA_OPTIONS para configurar los parámetros del modelo de NLP:

```json
{
    "temperature": 0.7,     # Control de creatividad (0.0 - 1.0)
    "num_predict": 500      # Máximo de tokens a generar
}
```

## Uso

Para testear el módulo de hotword, STT y NLP, ejecuta:

```powershell
python src\test\test_ai_nlp_stt_hotword.py
```

Para testear el módulo IoT, ejecuta:

```powershell
python src\test\test_iot.py
```

1. Iniciar el servidor:

```powershell
uvicorn src.main:app --reload
```

2. El servidor estará disponible en:

- API: http://127.0.0.1:8000
- Documentación: http://127.0.0.1:8000/docs

## Endpoints

### GET /status

Verifica el estado de los módulos NLP, STT y Speaker.

Respuesta:

```json
{
  "nlp": "ONLINE",
  "stt": "ONLINE",
  "speaker": "ONLINE",
  "hotword": "ONLINE"
}
```

### POST /nlp/query

Procesa una consulta en lenguaje natural.

Cuerpo de la solicitud:

```json
{
  "prompt": "Enciende la luz de la sala"
}
```

Respuesta:

```json
{
  "response": "[Respuesta del modelo]"
}
```

### POST /stt/transcribe

Convierte audio a texto utilizando el módulo Whisper.

Cuerpo de la solicitud (multipart/form-data):

```
file: [archivo de audio .wav]
```

Respuesta:

```json
{
  "text": "Texto transcrito del audio"
}
```

### POST /speaker/register

Registra un nuevo usuario con su voz, guardando el embedding en la base de datos.

Cuerpo de la solicitud (multipart/form-data):

```
name: [nombre del usuario]
file: [archivo de audio .wav]
```

Respuesta:

```json
{
  "message": "Usuario registrado exitosamente",
  "user_id": 1
}
```

### POST /speaker/identify

Identifica al hablante a partir de un archivo de audio.

Cuerpo de la solicitud (multipart/form-data):

```
file: [archivo de audio .wav]
```

Respuesta:

```json
{
  "identified_speaker": "Nombre del usuario identificado"
}
```

### PUT /config/assistant-name

Actualiza el nombre del asistente en la configuración.

Cuerpo de la solicitud:

```json
{
  "name": "Nuevo Nombre"
}
```

Respuesta:

```json
{
  "nlp": "ONLINE"
}
```

### PUT /config/owner-name

Actualiza el nombre del propietario en la configuración.

Cuerpo de la solicitud:

```json
{
  "name": "Nuevo Nombre del Propietario"
}
```

Respuesta:

```json
{
  "nlp": "ONLINE"
}
```

### POST /continuous_listening

Controla el inicio y la parada del modo de escucha continua.

Cuerpo de la solicitud:

```json
{
  "action": "start" // o "stop"
}
```

Respuesta (ejemplo para "start"):

```json
{
  "status": "success",
  "message": "Continuous listening started."
}
```

Respuesta (ejemplo para "stop"):

```json
{
  "status": "success",
  "message": "Continuous listening stopped."
}
```

### POST /hotword/process_audio

Procesa el audio después de la detección de hotword, realizando STT, identificación de hablante y NLP.

Cuerpo de la solicitud (multipart/form-data):

```
file: [archivo de audio .wav]
```

Respuesta:

```json
{
  "transcribed_text": "Texto transcrito del audio",
  "identified_speaker": "Nombre del usuario identificado",
  "nlp_response": "[Respuesta del modelo NLP]"
}
```

## Configuración del Asistente

El asistente utiliza un archivo de configuración ubicado en `src/ai/config/config.json` que permite personalizar su comportamiento:

```json
{
    "assistant_name": "Murph",          # Nombre del asistente (por defecto: Murph)
    "owner_name": "Propietario",        # Nombre del propietario (por defecto: Propietario)
    "language": "es",                   # Idioma de respuesta
    "model": {                          # Configuración del modelo de IA
        "name": "mistral:7b-instruct",  # Nombre del modelo a utilizar
        "temperature": 0.7,             # Temperatura para la generación (0.0 - 1.0)
        "max_tokens": 500               # Máximo de tokens en la respuesta (num_predict)
    },
    "capabilities": [                   # Lista de capacidades del asistente
        "control_luces",
        "control_temperatura",
        "control_dispositivos",
        "consulta_estado"
    ],
}
```

## Configuración de Hotword

La detección de hotword se configura a través de variables de entorno:

- `PICOVOICE_ACCESS_KEY`: Clave de acceso de Picovoice para la detección de hotword.
- `HOTWORD_PATH`: Ruta al archivo de modelo de hotword (`.ppn`).

## Configuración del Módulo IoT

El módulo IoT se configura a través de variables de entorno en el archivo `.env`:

- `SERIAL_PORT`: Puerto serial para la comunicación (ej. `COM3` en Windows, `/dev/ttyUSB0` en Linux).
- `SERIAL_BAUDRATE`: Velocidad en baudios para la comunicación serial (ej. `9600`).
- `MQTT_BROKER`: Dirección del broker MQTT (ej. `localhost`).
- `MQTT_PORT`: Puerto del broker MQTT (ej. `1883`).

Ejemplo de `.env`:

```
PICOVOICE_ACCESS_KEY=YOUR_PICOVOICE_ACCESS_KEY
HOTWORD_PATH=src/ai/hotword/models/model.ppn

# IoT Module Configuration
SERIAL_PORT=COM3
SERIAL_BAUDRATE=9600
MQTT_BROKER=localhost
MQTT_PORT=1883
```

## Estructura del Proyecto

```
├── .venv/                        # Entorno virtual de Python
├── data/                         # Base de datos
│   └── casa_inteligente.db       # Base de datos SQLite
├── requirements.txt              # Dependencias del proyecto
└── src/
    ├── __init__.py
    ├── ai/
    │   ├── __init__.py
    │   ├── config/               # Archivos de configuración
    │   │   └── config.json       # Configuración del asistente
    │   ├── hotword/              # Detección de hotword
    │   │   ├── hotword.py        # Integración con Picovoice Porcupine
    │   │   └── models/           # Modelos de hotword
    │   ├── nlp/                  # Módulo de procesamiento de lenguaje natural
    │   ├── stt/                  # Speech-to-Text
    │   │   └── stt.py            # Integración con Whisper local
    │   └── speaker/              # Identificación de hablantes
    │       └── speaker.py        # Embeddings con resemblyzer
    │
    ├── api/                      # Rutas y esquemas de la API
    │   ├── routes.py             # Endpoints principales
    │   └── schemas.py            # Pydantic schemas
    ├── db/                       # Rutas de db
    │   ├── database.py
    │   └── models.py
    │
    ├── iot/                      # Módulo de integración IoT
    │   ├── __init__.py           # Inicialización del módulo IoT
    │   ├── serial_manager.py     # Gestión de comunicación serial
    │   ├── mqtt_client.py        # Gestión de comunicación MQTT
    │   └── devices.py            # Definición de dispositivos IoT
    │
    ├── main.py                   # Punto de entrada de la aplicación
    └── test/
        ├── test_ai_nlp_stt_hotword_response.py # Archivo de prueba para hotword, STT, NLP Response
        ├── test_ai_nlp_stt_hotword.py # Archivo de prueba para hotword, STT y NLP
        └── test_iot.py               # Archivo de prueba para el módulo IoT
```
