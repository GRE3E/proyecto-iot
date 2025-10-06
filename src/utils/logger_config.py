import logging

class ColoredFormatter(logging.Formatter):
    """
    Sistema de formateo de logs con paleta profesional optimizada.
    Cada módulo y nivel de severidad usa un color único y no redundante,
    garantizando contraste y coherencia semántica en fondo oscuro.
    """

    # ====== Colores por nivel (no usados en módulos) ======
    LEVEL_COLORS = {
        'DEBUG': '\033[38;5;244m',     # Gris medio neutro
        'INFO': '\033[38;5;252m',      # Blanco tenue
        'WARNING': '\033[38;5;220m',   # Dorado intenso
        'ERROR': '\033[38;5;203m',     # Rojo coral
        'CRITICAL': '\033[1;41m\033[97m',  # Fondo rojo, texto blanco
    }

    # ====== Colores únicos por módulo ======
    MODULE_COLORS = {
        'HotwordDetector': '\033[38;5;39m',        # Azul cian intenso
        'STTModule': '\033[38;5;34m',              # Verde bosque
        'NLPModule': '\033[38;5;129m',             # Magenta elegante
        'TTSModule': '\033[38;5;178m',             # Amarillo ocre
        'TextSplitter': '\033[38;5;208m',          # Naranja vibrante para el separador de texto
        'SpeakerRecognitionModule': '\033[38;5;45m', # Cian brillante
        'APIRoutes': '\033[38;5;105m',             # Violeta claro para rutas API
        'APIUtils': '\033[38;5;105m',              # Violeta claro para utilidades API
        'AppLogger': '\033[38;5;33m',              # Azul corporativo
        'MainApp': '\033[38;5;141m',               # Lavanda
        'ConfigManager': '\033[38;5;112m',         # Verde esmeralda
        'SerialManager': '\033[38;5;218m',         # Rosa pastel (diferente del rojo)
        'MemoryManager': '\033[38;5;110m',         # Azul acero
        'OllamaManager': '\033[38;5;99m',          # Púrpura ceniza
        'MQTTClient': '\033[38;5;75m',             # Azul claro
        'root': '\033[38;5;240m',                  # Gris oscuro
    }

    RESET = '\033[0m'

    def format(self, record):
        asctime = self.formatTime(record, self.datefmt)
        message = record.getMessage()
        module_color = self.MODULE_COLORS.get(record.name, self.RESET)
        level_color = self.LEVEL_COLORS.get(record.levelname, self.RESET)
        return f"{asctime} - {module_color}[{record.name}]{self.RESET} {level_color}{message}{self.RESET}"


def setup_logging():
    """
    Configura el sistema de logging global con colores únicos,
    evitando solapamiento cromático entre módulos y niveles.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)

    # Eliminar handlers previos
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Reducir ruido de librerías externas
    for noisy in ["httpcore", "httpx", "python_multipart.multipart", "fsspec"]:
        logging.getLogger(noisy).setLevel(logging.WARNING)

    # Configurar formato y handler
    formatter = ColoredFormatter('%(asctime)s - [%(name)s] %(message)s')
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Bloquear propagación redundante
    logging.getLogger("uvicorn").propagate = False
    logging.getLogger("uvicorn.access").propagate = False

    logging.getLogger("AppLogger").info("Sistema de logging configurado con paleta cromática profesional.")
