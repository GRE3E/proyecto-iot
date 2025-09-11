# Proyecto IoT con NLP

## Descripción

Este proyecto implementa un servidor FastAPI que integra procesamiento de lenguaje natural (NLP) utilizando el modelo Mistral a través de Ollama para interpretar comandos en lenguaje natural.

## Requisitos

- Python 3.10 o superior
- Ollama instalado con el modelo mistral:7b-instruct
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

3. Asegurarse de tener Ollama instalado y el modelo mistral:7b-instruct descargado:

```powershell
ollama list  # Verificar que mistral:7b-instruct está instalado
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
  "response": "[Respuesta del modelo Mistral]"
}
```

## Estructura del Proyecto

```
├── .venv/              # Entorno virtual de Python
├── requirements.txt    # Dependencias del proyecto
└── src/
    ├── ai/
    │   └── nlp/       # Módulo de procesamiento de lenguaje natural
    ├── api/           # Rutas y esquemas de la API
    └── main.py        # Punto de entrada de la aplicación
```
