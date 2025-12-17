# Generación de Dataset Sintético para Fine-tuning

Este módulo contiene herramientas para generar datasets sintéticos de alta calidad para entrenar modelos de lenguaje (LLMs) especializados en IoT.

## Estructura del Código

El script principal `dataset_generator.py` ha sido refactorizado siguiendo principios de **Clean Code** y **Programación Orientada a Objetos**.

### Componentes Principales

- **Enums (`Location`, `DeviceType`, `Action`)**: Definen el vocabulario controlado del dominio, eliminando "magic strings".
- **`IotCommandGenerator`**: Clase auxiliar encargada de generar payloads MQTT consistentes y realistas.
- **`ScenarioGenerator`**: Clase central que encapsula la lógica para crear diferentes tipos de ejemplos de entrenamiento:

  - `create_identity_example`: Preguntas sobre la identidad del asistente.
  - `create_execution_example`: Comandos estándar de control IoT.
  - `create_ambiguity_example`: Escenarios donde falta información (ubicación) y el asistente debe preguntar.
  - `create_negation_example`: Comandos negativos ("No enciendas nada").
  - `create_music_example`: Comandos de música (Play, Pause, Volumen).
  - `create_routine_example`: Ejecución de rutinas por nombre.
  - `create_info_example`: Consultas de hora y temperatura.
  - `create_special_example`: Cambio de nombre y preferencias de usuario.

- **`DatasetGenerator`**: Orquestador que gestiona la configuración y el ciclo de generación del archivo de salida.

## Uso

Para generar un nuevo dataset de entrenamiento (ejecutar desde la raíz del proyecto):

```bash
python -m src.ai.model_finetuning.dataset_generator
```

Esto generará un archivo `train.jsonl` en el mismo directorio con 500 ejemplos (por defecto).

## Configuración

Puedes modificar las constantes en `dataset_generator.py` para adaptar el generador:

- Añadir nuevas ubicaciones en `Location`.
- Añadir nuevos dispositivos en `DeviceType`.
- Ajustar las probabilidades de cada escenario en `DatasetGenerator.generate()`.

## Ollama

Para cargar el modelo finetuned en Ollama, puedes usar el siguiente comando:

```bash
ollama create murphy -f Modelfile
```

Esto creará un nuevo modelo llamado "murphy" en Ollama.
