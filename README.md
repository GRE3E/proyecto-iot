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
python -m venv .venv
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
├── .venv/              # Entorno virtual de Python
├── data/               # Base de datos
│   └── casa_inteligente.db     # Base de datos SQLite
├── requirements.txt    # Dependencias del proyecto
└── src/
    ├── ai/
    │   ├── config/    # Archivos de configuración
    │   │   └── config.json    # Configuración del asistente
    │   └── nlp/       # Módulo de procesamiento de lenguaje natural
    ├── api/           # Rutas y esquemas de la API
    └── main.py        # Punto de entrada de la aplicación
```
