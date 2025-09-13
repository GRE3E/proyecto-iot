# Proyecto IoT

## Descripción

Este proyecto implementa un servidor FastAPI que integra procesamiento de lenguaje natural (NLP) utilizando el modelo a través de Ollama, Speech-to-Text (STT) con Whisper para transcribir audio a texto, y un módulo de identificación de hablantes con resemblyzer. El objetivo es interpretar comandos en lenguaje natural y reconocer a los usuarios por su voz para una casa inteligente.

## Requisitos

- Python 3.10 o superior
- Ollama instalado con el modelo (para NLP)
- Dependencias listadas en requirements.txt
- Modelos de Whisper (se descargarán automáticamente al usar el módulo STT)

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
    "temperature": 0.7,    # Control de creatividad (0.0 - 1.0)
    "num_predict": 500    # Máximo de tokens a generar
}
```

## Uso

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
  "speaker": "ONLINE"
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
    # Nota: La configuración del modelo se aplica mediante OLLAMA_OPTIONS
    "capabilities": [                   # Lista de capacidades del asistente
        "control_luces",
        "control_temperatura",
        "control_dispositivos",
        "consulta_estado"
    ],
}
```

## Estructura del Proyecto

```
├── .venv/                        # Entorno virtual de Python
├── data/                         # Base de datos
│   └── casa_inteligente.db       # Base de datos SQLite
├── requirements.txt              # Dependencias del proyecto
└── src/
    ├── ai/
    │   ├── config/               # Archivos de configuración
    │   │   └── config.json       # Configuración del asistente
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
    └── main.py                   # Punto de entrada de la aplicación
```
