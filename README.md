# Proyecto IoT - Asistente de Hogar Inteligente

## Descripción

Este proyecto es un asistente de hogar inteligente avanzado, diseñado para interactuar de manera eficiente y segura con el usuario para controlar dispositivos IoT, ejecutar comandos específicos y proporcionar información relevante sobre el entorno del hogar. Utiliza procesamiento de lenguaje natural (NLP), reconocimiento de voz (STT y Speaker Recognition), síntesis de voz (TTS), detección de hotword y comunicación con dispositivos IoT a través de MQTT.

## Requisitos

- Python 3.10 o superior
- Ollama instalado con el modelo (para NLP)
- Dependencias listadas en `requirements.txt`
- Modelos de Whisper (se descargarán automáticamente al usar el módulo STT)
- FFmpeg para el módulo de síntesis de voz (TTS)
- Picovoice Console para obtener una clave de acceso y entrenar una palabra clave personalizada.
- Configuración de MQTT para la comunicación con dispositivos IoT.
- CMake para el modulo de reconocimiento facial

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

5.  **El sistema utiliza el archivo `src/ai/config/config.json` para configurar los parámetros del modelo de NLP:**

    ```json
    {
        "name": "qwen2.5:3b-instruct",  # Nombre del modelo de Ollama
        "temperature": 0.3,             # Control de creatividad (0.0 - 1.0)
        "top_p": 0.9,                   # Muestreo de tokens (probabilidad acumulada)
        "top_k": 40,                    # Muestreo de tokens (k-ésimo más probable)
        "repeat_penalty": 1.1,          # Penalización por repetición
        "num_ctx": 8192,                # Tamaño del contexto
        "max_tokens": 1024              # Máximo de tokens a generar
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

## Estructura del Proyecto

```
├── .gitignore
├── example.env
├── requirements.txt
├── README.md
└── src/
    ├── ai/
    │   ├── config/
    │   │   └── config.json
    │   ├── hotword/
    │   │   ├── models/
    │   │   └── hotword.py
    │   ├── nlp/
    │   │   ├── config_manager.py
    │   │   ├── iot_command_cache.py
    │   │   ├── iot_command_processor.py
    │   │   ├── memory_manager.py
    │   │   ├── nlp_core.py
    │   │   ├── ollama_manager.py
    │   │   ├── prompt_creator.py
    │   │   ├── prompt_loader.py
    │   │   └── system_prompt.yaml
    │   │   └── user_manager.py
    │   ├── speaker/
    │   │   └── speaker.py
    │   ├── stt/
    │   │   └── stt.py
    │   ├── tts/ EDUARDO
    │   │   └── generated_audio/
    │   │   ├── text_splitter.py
    │   │   ├── tts_module.py
    ├── api/
    │   ├── addons_routes.py
    │   ├── addons_schemas.py
    │   ├── auth_router.py
    │   ├── auth_schemas.py
    │   ├── face_recognition_routes.py
    │   ├── face_recognition_schemas.py
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
    ├── auth/ RODRIGO
    │   ├── auth_service.py
    │   ├── device_auth.py
    │   └── jwt_manager.py
    ├── db/
    │   ├── database.py
    │   └── models.py
    ├── iot/ MARKOS
    │   ├── arduino_code/
    │   │   └── Commands.txt
    │   │   ├── Master.txt
    │   │   ├── Slave1.txt
    │   │   ├── Slave2.txt
    │   │   ├── Slave3.txt
    │   │   └── Wifi.txt
    │   ├── device_manager.py
    │   └── mqtt_client.py
    ├── main.py
    ├── rc/ ANDER
    │   ├── capture.py
    │   ├── encode.py
    │   ├── rc_core.py
    │   └── recognize.py
    ├── test/
    │   ├── test_ai_nlp_stt_hotword.py
    │   ├── test_ai_nlp_stt_hotword_response.py
    │   ├── test_cuda.py
    │   ├── test_face_pipeline.py
    │   ├── test_face_recognition.py
    │   ├── test_iot.py
    │   ├── test_mqtt_wifi.py
    │   └── test_tts.py
    └── utils/
        ├── datetime_utils.py
        ├── error_handler.py
        └── logger_config.py
```

## Configuración de .env

Para configurar las variables de entorno necesarias, crea un archivo `.env` en la raíz del proyecto y copia el contenido de `example.env` en él. Luego, reemplaza los valores de ejemplo con tus propias configuraciones.

### Variables de Entorno

- **Hotword Configuration**

  - `PICOVOICE_ACCESS_KEY`: Clave de acceso para el servicio Picovoice.
  - `HOTWORD_PATH`: Ruta al modelo de hotword.

- **IoT Module Configuration**

  - `MQTT_BROKER`: Dirección del broker MQTT.
  - `MQTT_PORT`: Puerto del broker MQTT.

- **Ollama Configuration**

  - `OLLAMA_HOST`: URL del host de Ollama.

- **JWT Configuration**

  - `SECRET_KEY_JWT`: Clave secreta para la firma de tokens JWT.
  - `ALGORITHM_JWT`: Algoritmo de cifrado para JWT (ej. "HS256").
  - `ACCESS_TOKEN_EXPIRE_MINUTES`: Tiempo de expiración del token de acceso en minutos.
  - `REFRESH_TOKEN_EXPIRE_DAYS`: Tiempo de expiración del token de refresco en días.

- **Device Authentication**
  - `DEVICE_API_KEY`: Clave API para la autenticación de dispositivos.

## Endpoints

Los endpoints de la API están definidos en el directorio `src/api/` y se agrupan por funcionalidad. Puedes explorar la documentación interactiva en `http://127.0.0.1:8000/docs` para ver todos los endpoints disponibles y sus esquemas.

## Endpoints de Addons

### Actualizar Zona Horaria

- **URL:** `/addons/timezone`
- **Método:** `PUT`
- **Descripción:** Actualiza la zona horaria de la configuración del asistente.
- **Request Body:**
  ```json
  {
    "timezone": "America/Lima"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Zona horaria actualizada a America/New_York"
  }
  ```

## Endpoints de Autenticación

### Registrar Usuario

- **URL:** `/auth/register`
- **Método:** `POST`
- **Descripción:** Registra un nuevo usuario en el sistema.
- **Request Body:**
  ```json
  {
    "username": "nombre_de_usuario",
    "password": "contraseña_segura",
    "is_owner": false
  }
  ```
- **Response:**
  ```json
  {
    "message": "Usuario nombre_de_usuario registrado exitosamente"
  }
  ```

### Iniciar Sesión

- **URL:** `/auth/login`
- **Método:** `POST`
- **Descripción:** Autentica a un usuario y devuelve tokens de acceso y refresco.
- **Request Body (form-data):**
  - `username`: nombre_de_usuario
  - `password`: contraseña_segura
- **Response:**
  ```json
  {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "bearer"
  }
  ```

### Refrescar Token

- **URL:** `/auth/refresh-token`
- **Método:** `POST`
- **Descripción:** Refresca el token de acceso utilizando un token de refresco válido.
- **Request Body:**
  ```json
  {
    "refresh_token": "..."
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "bearer"
  }
  ```

### Obtener Perfil de Usuario

- **URL:** `/auth/me`
- **Método:** `GET`
- **Descripción:** Obtiene el perfil del usuario autenticado.
- **Headers:**
  - `Authorization`: `Bearer <access_token>`
- **Response:**
  ```json
  {
    "user": {
      "id": "...",
      "username": "...",
      "is_owner": false
    }
  }
  ```

## Endpoints de Reconocimiento Facial

### Listar Usuarios

- **URL:** `/rc/users`
- **Método:** `GET`
- **Descripción:** Lista todos los usuarios registrados en el sistema.
- **Headers:**
  - `Authorization`: `Bearer <access_token>`
- **Response:**
  ```json
  [
    {
      "id": 1,
      "name": "John Doe"
    }
  ]
  ```

### Registrar Nuevo Usuario

- **URL:** `/rc/users/{user_name}`
- **Método:** `POST`
- **Descripción:** Registra un nuevo usuario en el sistema.
- **Parámetros de Query:**
  - `user_name` (path): Nombre del usuario a registrar.
  - `num_photos` (query, opcional): Número de fotos a capturar para el registro (por defecto: 5, min: 1, max: 10).
- **Headers:**
  - `Authorization`: `Bearer <access_token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Usuario registrado exitosamente. Se generó una contraseña aleatoria."
  }
  ```

### Registrar Rostro para Usuario Existente

- **URL:** `/rc/users/{user_id}/register_face`
- **Método:** `POST`
- **Descripción:** Registra el reconocimiento facial para un usuario existente por su ID.
- **Parámetros de Query:**
  - `user_id` (path): ID del usuario existente.
  - `num_photos` (query, opcional): Número de fotos a capturar para el registro (por defecto: 5, min: 1, max: 10).
- **Headers:**
  - `Authorization`: `Bearer <access_token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Rostro registrado exitosamente para el usuario."
  }
  ```

### Eliminar Usuario

- **URL:** `/rc/users/{user_name}`
- **Método:** `DELETE`
- **Descripción:** Elimina un usuario del sistema.
- **Parámetros de Query:**
  - `user_name` (path): Nombre del usuario a eliminar.
- **Headers:**
  - `Authorization`: `Bearer <access_token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Usuario eliminado exitosamente."
  }
  ```

### Realizar Reconocimiento Facial

- **URL:** `/rc/recognize`
- **Método:** `POST`
- **Descripción:** Realiza el reconocimiento facial desde una fuente específica (cámara o archivo).
- **Parámetros de Query:**
  - `source` (query, opcional): Fuente de la imagen ("camera" o una ruta de archivo).
- **Request Body (multipart/form-data):**
  - `file` (opcional): Archivo de imagen a subir para el reconocimiento.
- **Headers:**
  - `Authorization`: `Bearer <access_token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Reconocimiento facial completado.",
    "user_name": "John Doe",
    "user_id": 1
  }
  ```

### Obtener Estado del Sistema de Reconocimiento Facial

- **URL:** `/rc/status`
- **Método:** `GET`
- **Descripción:** Verifica el estado del sistema de reconocimiento facial.
- **Headers:**
  - `Authorization`: `Bearer <access_token>`
- **Response:**
  ```json
  {
    "status": "online"
  }
  ```

## Endpoints de Hotword

### Procesar Audio de Hotword

- **URL:** `/hotword/process_audio`
- **Método:** `POST`
- **Descripción:** Procesa el audio tras la detección de hotword, realizando STT, identificación de hablante, procesamiento NLP y generación TTS.
- **Request Body (multipart/form-data):**
  - `audio_file`: Archivo de audio en formato WAV.
- **Headers:**
  - `X-Device-API-Key`: Clave API del dispositivo para autenticación.
- **Response:**
  ```json
  {
    "transcribed_text": "Texto transcrito del audio",
    "identified_speaker": "Nombre del hablante identificado",
    "nlp_response": "Respuesta del procesamiento NLP",
    "tts_audio_paths": []
  }
  ```

### IoT Endpoints

The following endpoints are available for managing IoT devices and commands:

#### `POST /iot/arduino/send_command` and `POST /iot/command`

- **URL**: `/iot/arduino/send_command` or `/iot/command`
- **Method**: `POST`
- **Description**: Sends a command to an Arduino device via MQTT and updates its state in the database.
- **Request Body**:
  ```json
  {
    "mqtt_topic": "string",
    "command_payload": "string"
  }
  ```
- **Response**:
  ```json
  {
    "status": "Command sent and device state updated",
    "topic": "string",
    "payload": "string"
  }
  ```

#### `GET /iot/device_states`

- **URL**: `/iot/device_states`
- **Method**: `GET`
- **Description**: Retrieves the current states of all IoT devices stored in the database.
- **Response**:
  ```json
  [
    {
      "id": 0,
      "device_name": "string",
      "device_type": "string",
      "state_json": {},
      "last_updated": "2024-01-01T12:00:00Z"
    }
  ]
  ```

#### `GET /iot/dashboard_data`

- **URL**: `/iot/dashboard_data`
- **Method**: `GET`
- **Description**: Retrieves current IoT dashboard data, including device states and sensor readings.
- **Response**:
  ```json
  {
    "data": {}
  }
  ```

#### `POST /iot/commands`

- **URL**: `/iot/commands`
- **Method**: `POST`
- **Description**: Creates one or more new IoT commands in the database.
- **Request Body**:
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
- **Response**:
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

#### `GET /iot/commands`

- **URL**: `/iot/commands`
- **Method**: `GET`
- **Description**: Retrieves a list of IoT commands from the database.
- **Query Parameters**:
  - `skip`: (Optional) Number of items to skip. (integer)
  - `limit`: (Optional) Maximum number of items to return. (integer)
- **Response**:
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

#### `GET /iot/commands/{command_id}`

- **URL**: `/iot/commands/{command_id}`
- **Method**: `GET`
- **Description**: Retrieves a specific IoT command by its ID.
- **Path Parameters**:
  - `command_id`: The ID of the command to retrieve. (integer)
- **Response**:
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

#### `PUT /iot/commands/{command_id}`

- **URL**: `/iot/commands/{command_id}`
- **Method**: `PUT`
- **Description**: Updates an existing IoT command by its ID.
- **Path Parameters**:
  - `command_id`: The ID of the command to update. (integer)
- **Request Body**:
  ```json
  {
    "name": "string",
    "description": "string",
    "command_type": "string",
    "command_payload": "string",
    "mqtt_topic": "string"
  }
  ```
- **Response**:
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

#### `DELETE /iot/commands/{command_id}`

- **URL**: `/iot/commands/{command_id}`
- **Method**: `DELETE`
- **Description**: Deletes an IoT command by its ID.
- **Path Parameters**:
  - `command_id`: The ID of the command to delete. (integer)
- **Response**: `204 No Content` (Successful deletion)

### NLP Endpoints

The following endpoints are available for Natural Language Processing (NLP) functionalities:

#### `POST /nlp/query`

- **URL**: `/nlp/query`
- **Method**: `POST`
- **Description**: Processes an NLP query and returns a generated response.
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response**:
  ```json
  {
    "response": "string",
    "preference_key": "string",
    "preference_value": "string",
    "command": "string",
    "prompt_sent": "string",
    "user_name": "string",
    "user_id": 0
  }
  ```

#### `PUT /config/assistant-name`

- **URL**: `/config/assistant-name`
- **Method**: `PUT`
- **Description**: Updates the assistant's name in the configuration.
- **Request Body**:
  ```json
  {
    "name": "string"
  }
  ```
- **Response**:
  ```json
  {
    "status": "string",
    "message": "string"
  }
  ```

#### `PUT /config/capabilities`

- **URL**: `/config/capabilities`
- **Method**: `PUT`
- **Description**: Updates the assistant's capabilities in the configuration.
- **Request Body**:
  ```json
  {
    "capabilities": ["string"]
  }
  ```
- **Response**:
  ```json
  {
    "status": "string",
    "message": "string"
  }
  ```

#### `GET /nlp/history`

- **URL**: `/nlp/history`
- **Method**: `GET`
- **Description**: Retrieves the conversation history for a specific user.
- **Query Parameters**:
  - `limit`: (Optional) Maximum number of conversation entries to return. (integer, default: 100)
- **Response**:
  ```json
  {
    "history": [
      {
        "user_message": "string",
        "assistant_message": "string"
      }
    ]
  }
  ```

### Permissions Endpoints

The following endpoints are available for managing user permissions:

#### `POST /permissions/`

- **URL**: `/permissions/`
- **Method**: `POST`
- **Description**: Creates a new permission.
- **Request Body**:
  ```json
  {
    "name": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": 0,
    "name": "string"
  }
  ```

#### `GET /permissions/`

- **URL**: `/permissions/`
- **Method**: `GET`
- **Description**: Retrieves a list of all permissions.
- **Query Parameters**:
  - `skip`: (Optional) Number of items to skip. (integer)
  - `limit`: (Optional) Maximum number of items to return. (integer)
- **Response**:
  ```json
  [
    {
      "id": 0,
      "name": "string"
    }
  ]
  ```

#### `POST /users/{user_id}/permissions/`

- **URL**: `/users/{user_id}/permissions/`
- **Method**: `POST`
- **Description**: Assigns a permission to a specific user.
- **Path Parameters**:
  - `user_id`: The ID of the user to assign the permission to. (integer)
- **Request Body**:
  ```json
  {
    "permission_id": 0
  }
  ```
- **Response**:
  ```json
  {
    "user_id": 0,
    "permission_id": 0
  }
  ```

#### `GET /users/{user_id}/permissions/check/{permission_name}`

- **URL**: `/users/{user_id}/permissions/check/{permission_name}`
- **Method**: `GET`
- **Description**: Checks if a user has a specific permission.
- **Path Parameters**:
  - `user_id`: The ID of the user. (integer)
  - `permission_name`: The name of the permission to check. (string)
- **Response**:
  ```json
  true
  ```

#### `DELETE /users/{user_id}/permissions/`

- **URL**: `/users/{user_id}/permissions/`
- **Method**: `DELETE`
- **Description**: Removes a permission from a user.
- **Path Parameters**:
  - `user_id`: The ID of the user. (integer)
- **Request Body**:
  ```json
  {
    "permission_id": 0
  }
  ```
- **Response**: `204 No Content` (Successful deletion)

### Main Routes

- **GET /status**
  - **URL:** `/status`
  - **Method:** `GET`
  - **Description:** Returns the current status of the modules.
  - **Response:**
    ```json
    {
      "status": "success",
      "message": "All modules are online and functioning."
    }
    ```

### Speaker Routes

- **POST /speaker/register**

  - **URL:** `/speaker/register`
  - **Method:** `POST`
  - **Description:** Registra un nuevo usuario con su voz y devuelve un token de autenticación.
  - **Request Body (multipart/form-data):**
    - `name`: (string) The name of the user.
    - `audio_file`: (file) The audio file containing the user's voice.
    - `is_owner`: (boolean, optional) Whether the user is an owner. Defaults to `false`.
  - **Response:**
    ```json
    {
      "access_token": "string",
      "token_type": "bearer"
    }
    ```

- **POST /speaker/register_owner**

  - **URL:** `/speaker/register_owner`
  - **Method:** `POST`
  - **Description:** Registra un nuevo usuario como propietario con su voz y devuelve un token de autenticación.
  - **Request Body (multipart/form-data):**
    - `name`: (string) The name of the owner user.
    - `audio_file`: (file) The audio file containing the owner's voice.
  - **Response:**
    ```json
    {
      "access_token": "string",
      "token_type": "bearer"
    }
    ```

- **POST /speaker/identify**

  - **URL:** `/speaker/identify`
  - **Method:** `POST`
  - **Description:** Identifica quién habla y devuelve su token de acceso. Si no hay usuarios registrados o no se identifica al usuario, indica que se necesita registro.
  - **Request Body (multipart/form-data):**
    - `audio_file`: (file) The audio file to identify the speaker from.
  - **Response:**
    ```json
    {
      "access_token": "string",
      "token_type": "bearer"
    }
    ```

- **POST /speaker/add_voice_to_user**

  - **URL:** `/speaker/add_voice_to_user`
  - **Method:** `POST`
  - **Description:** Añade un registro de voz a una cuenta de usuario ya existente.
  - **Request Body (multipart/form-data):**
    - `user_id`: (integer) The ID of the user to add the voice to.
    - `audio_file`: (file) The audio file containing the user's voice.
  - **Response:**
    ```json
    {
      "access_token": "string",
      "token_type": "bearer"
    }
    ```

- **GET /speaker/users**

  - **URL:** `/speaker/users`
  - **Method:** `GET`
  - **Description:** Obtiene la lista de todos los usuarios registrados y sus características.
  - **Response:**
    ```json
    {
      "user_count": 0,
      "users": [
        {
          "id": 0,
          "name": "string",
          "is_owner": false
        }
      ]
    }
    ```

- **POST /speaker/update_owner**
  - **URL:** `/speaker/update_owner`
  - **Method:** `POST`
  - **Description:** Actualiza el estado de propietario de un usuario registrado.
  - **Request Body (application/json):**
    ```json
    {
      "user_id": 0,
      "is_owner": false
    }
    ```
  - **Response:**
    ```json
    {
      "status": "string",
      "message": "string"
    }
    ```

### STT Routes

- **POST /stt/transcribe**
  - **URL:** `/stt/transcribe`
  - **Method:** `POST`
  - **Description:** Convierte voz a texto usando el módulo STT.
  - **Request Body (multipart/form-data):**
    - `audio_file`: (file) The audio file to transcribe.
  - **Response:**
    ```json
    {
      "text": "string"
    }
    ```

### TTS Routes

- **POST /tts/generate_audio**
  - **URL:** `/tts/generate_audio`
  - **Method:** `POST`
  - **Description:** Genera un archivo de audio a partir de texto usando el módulo TTS.
  - **Request Body (application/json):**
    ```json
    {
      "text": "string"
    }
    ```
  - **Response:**
    ```json
    {
      "audio_file_paths": ["string"]
    }
    ```
