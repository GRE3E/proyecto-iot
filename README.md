# Proyecto IoT

## Descripción

Este proyecto implementa un servidor FastAPI que integra procesamiento de lenguaje natural (NLP) utilizando el modelo a través de Ollama para interpretar comandos en lenguaje natural.

## Requisitos

- Python 3.10 o superior
- Ollama instalado con el modelo
- Dependencias listadas en requirements.txt

## Instalación

1. Crear y activar entorno virtual:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process; ./.venv/Scripts/Activate.ps1
```

2. Instalar dependencias:

```powershell
pip install -r requirements.txt
```

3. Asegurarse de tener Ollama instalado y el modelo descargado:

```powershell
ollama list  # Verificar que el modelo está instalado
```

4. El sistema utiliza la variable de entorno OLLAMA_OPTIONS para configurar los parámetros del modelo:

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

Verifica el estado del módulo NLP.

Respuesta:

```json
{"nlp": "ONLINE"}  # cuando Ollama está disponible
{"nlp": "OFFLINE"} # cuando Ollama no está disponible
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

## Configuración del Asistente

El asistente utiliza un archivo de configuración ubicado en `src/ai/config/config.json` que permite personalizar su comportamiento:

```json
{
    "assistant_name": "Murph",    # Nombre del asistente (por defecto: Murph)
    "language": "es",           # Idioma de respuesta
    "model": {                  # Configuración del modelo de IA
        "name": "mistral:7b-instruct",  # Nombre del modelo a utilizar
        "temperature": 0.7,      # Temperatura para la generación (0.0 - 1.0)
        "max_tokens": 500        # Máximo de tokens en la respuesta (num_predict)
    },
    # Nota: La configuración del modelo se aplica mediante OLLAMA_OPTIONS
    "capabilities": [           # Lista de capacidades del asistente
        "control_luces",
        "control_temperatura",
        "control_dispositivos",
        "consulta_estado"
    ],
    "memory_file": "memory.json", # Archivo de memoria
    "memory_size": 100          # Número máximo de conversaciones guardadas
}
```

## Sistema de Memoria

El asistente mantiene un sistema de memoria persistente en `src/ai/nlp/memory.json` que incluye:

- Estado de dispositivos
- Preferencias del usuario
- Registro de última interacción

Estructura del archivo de memoria:

```json
{
    "device_states": {         # Estado actual de los dispositivos
        "luces": {},
        "temperatura": {},
        "dispositivos": {}
    },
    "user_preferences": {},    # Preferencias personalizadas
    "last_interaction": null   # Timestamp de última interacción
}
```

El asistente registra el historial de conversaciones en `src/ai/logs/logs_ai.json` para análisis posterior.

```json
[
  {
    "timestamp": "2025-09-11T02:23:06.160261",
    "prompt": "Cual es tu nombre",
    "response": "Hola! Soy Murph, el asistente de casa inteligente. ¡Aquí para ayudarte con tus dispositivos y responder tus preguntas sobre el hogar! ¿Cómo puedo ayudarte hoy?"
  }
]
```

## Estructura del Proyecto

```
├── .venv/              # Entorno virtual de Python
├── requirements.txt    # Dependencias del proyecto
└── src/
    ├── ai/
    │   ├── config/    # Archivos de configuración
    │   │   ├── config.json    # Configuración del asistente
    │   │   └── memory.json    # Memoria persistente
    │   ├── logs/      # Registros de conversaciones
    │   │   └── logs_ai.json    # Historial completo de interacciones
    │   └── nlp/       # Módulo de procesamiento de lenguaje natural
    ├── api/           # Rutas y esquemas de la API
    └── main.py        # Punto de entrada de la aplicación
```
