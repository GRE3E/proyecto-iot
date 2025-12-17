import logging
from pathlib import Path
from src.ai.nlp.config.config_manager import ConfigManager
from src.services.audit_service import get_audit_service

class ColoredFormatter(logging.Formatter):
    """
    Sistema de formateo de logs con paleta profesional optimizada.
    Cada módulo y nivel de severidad usa un color único y no redundante,
    garantizando contraste y coherencia semántica en fondo oscuro.
    """

    # ====== Colores por nivel (no usados en módulos) ======
    LEVEL_COLORS = {
        'DEBUG': '\033[38;5;244m',                      # Gris medio neutro (ANSI 244)
        'INFO': '\033[38;5;252m',                       # Blanco tenue (ANSI 252)
        'WARNING': '\033[38;5;220m',                    # Dorado intenso (ANSI 220)
        'ERROR': '\033[38;5;203m',                      # Rojo coral (ANSI 203)
        'CRITICAL': '\033[1;41m\033[97m',               # Fondo rojo, texto blanco (ANSI 1;41m, 97m)
    }

    # ====== Colores únicos por módulo ======
    MODULE_COLORS = {
        'HotwordDetector': '\033[38;5;39m',             # Azul cian intenso (ANSI 39)
        'ContextHandler': '\033[38;5;208m',             # Naranja vibrante (ANSI 208)
        'ResponseHandler': '\033[38;5;184m',          # Verde amarillento (ANSI 184)
        'ResponseProcessor': '\033[38;5;184m',          # Verde amarillento (ANSI 184)
        'RoutineHandler': '\033[38;5;159m',             # Morado claro (ANSI 159)
        'ContextTracker': '\033[38;5;201m',             # Rosa oscuro (ANSI 201)
        'MemoryBrain': '\033[38;5;160m',                # Rojo oscuro (ANSI 160)
        'MemoryManager': '\033[38;5;109m',              # Verde lima (ANSI 109)
        'PatternAnalyzer': '\033[38;5;207m',            # Naranja claro (ANSI 207)
        'RoutineManager': '\033[38;5;159m',             # Morado claro (ANSI 159)
        'RoutineScheduler': '\033[38;5;117m',           # Azul claro (ANSI 117)
        'UserManager': '\033[38;5;167m',                # Rojo anaranjado (ANSI 167)
        'ConfigManager': '\033[38;5;112m',              # Verde esmeralda (ANSI 112)
        'DeviceContext': '\033[38;5;193m',              # Verde claro (ANSI 193)
        'IoTCommandCache': '\033[38;5;214m',            # Naranja rojizo (ANSI 214)
        'IoTCommandProcessor': '\033[38;5;202m',        # Naranja oscuro (ANSI 202)
        'MusicIntentProcessor': '\033[38;5;202m',       # Naranja oscuro (ANSI 202)
        'MusicManager': '\033[38;5;214m',               # Naranja rojizo (ANSI 214)
        'MpvPlayer': '\033[38;5;208m',                  # Naranja vibrante (ANSI 208)
        'MusicCommandHandler': '\033[38;5;166m',        # Naranja quemado (ANSI 166)
        'VlcPlayer': '\033[38;5;203m',                  # Rojo coral (ANSI 203)
        'YtDlpExtractor': '\033[38;5;220m',             # Dorado intenso (ANSI 220)
        'NLPModule': '\033[38;5;129m',                  # Magenta (ANSI 129)
        'OllamaManager': '\033[38;5;99m',               # Púrpura grisáceo (ANSI 99)
        'PromptCreator': '\033[38;5;226m',              # Amarillo brillante (ANSI 226)
        'PromptLoader': '\033[38;5;198m',               # Rosa fuerte (ANSI 198)
        'PromptProcessor': '\033[38;5;219m',            # Amarillo claro (ANSI 219)
        'ValidationHelper': '\033[38;5;153m',           # Cian (ANSI 153)
        'SpeakerRecognitionModule': '\033[38;5;170m',   # Púrpura claro (ANSI 170)
        'STTModule': '\033[38;5;34m',                   # Verde bosque (ANSI 34)
        'TextSplitter': '\033[38;5;208m',               # Naranja vibrante (ANSI 208)
        'TTSModule': '\033[38;5;178m',                  # Amarillo ocre (ANSI 178)
        'APIRoutes': '\033[38;5;105m',                  # Violeta claro (ANSI 105)
        'APIUtils': '\033[38;5;104m',                   # Violeta medio (ANSI 104)
        'AuthService': '\033[38;5;135m',                # Púrpura claro (ANSI 135)
        'AuthInit': '\033[38;5;135m',                   # Púrpura claro (ANSI 135)
        'DeviceAuth': '\033[38;5;75m',                  # Azul verdoso (ANSI 75)
        'FaceAuthRecovery': '\033[38;5;135m',           # Púrpura claro (ANSI 135)
        'JWTManager': '\033[38;5;108m',                 # Verde azulado (ANSI 108)
        'VoiceAuthRecovery': '\033[38;5;135m',          # Púrpura claro (ANSI 135)
        'Database': '\033[38;5;37m',                    # Azul cian (ANSI 37)
        'Migrations': '\033[38;5;124m',                 # Rosa claro (ANSI 124)
        'DeviceManager': '\033[38;5;81m',               # Azul verdoso claro (ANSI 81)
        'MQTTClient': '\033[38;5;123m',                 # Verde brillante (ANSI 123)
        'FaceCapture': '\033[38;5;21m',                 # Azul oscuro (ANSI 21)
        'FaceEncoder': '\033[38;5;22m',                 # Verde muy oscuro (ANSI 22)
        'FaceRecognitionCore': '\033[38;5;190m',        # Verde amarillento (ANSI 190)
        'FaceRecognizer': '\033[38;5;23m',              # Gris azulado oscuro (ANSI 23)
        'DateTimeUtils': '\033[38;5;228m',              # Amarillo pálido (ANSI 228)
        'ErrorHandler': '\033[38;5;166m',               # Naranja quemado (ANSI 166)
        'Websocket': '\033[38;5;111m',                  # Azul claro/Cian (ANSI 111)
        'AppLogger': '\033[38;5;33m',                   # Azul medio (ANSI 33)
        'WeatherRoutes': '\033[38;5;151m',              # Azul claro/Cian (ANSI 151)
        'WeatherUtils': '\033[38;5;191m',               # Azul claro/Cian (ANSI 191)
        'MainApp': '\033[38;5;141m',                    # Lavanda (ANSI 141)
        'root': '\033[38;5;245m',                       # Gris claro (ANSI 245)
    }

    RESET = '\033[0m'

    def format(self, record):
        asctime = self.formatTime(record, self.datefmt)
        message = record.getMessage()
        module_color = self.MODULE_COLORS.get(record.name, self.RESET)
        level_color = self.LEVEL_COLORS.get(record.levelname, self.RESET)
        return f"{asctime} - {module_color}[{record.name}]{self.RESET} {level_color}{message}{self.RESET}"


class AuditLogHandler(logging.Handler):
    """
    Handler personalizado que redirige los logs al servicio de auditoría
    para ser escritos en el archivo diario.
    """
    def emit(self, record):
        try:
            msg = self.format(record)
            get_audit_service().write_raw_line(msg)
        except Exception:
            self.handleError(record)


def setup_logging():
    """
    Configura el sistema de logging global con colores únicos,
    evitando solapamiento cromático entre módulos y niveles.
    """
    root_logger = logging.getLogger()
    
    # Determinar el nivel de logging basado en config.json
    project_root = Path(__file__).parent.parent.parent
    config_path = project_root / "config" / "config.json"
    config_manager = ConfigManager(config_path)
    app_config = config_manager.get_config()
    
    if app_config.get("debug", False):
        root_logger.setLevel(logging.DEBUG)
    else:
        root_logger.setLevel(logging.INFO)

    # Eliminar handlers previos
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Reducir ruido de librerías externas
    for noisy in ["httpcore", "httpx", "python_multipart.multipart", "fsspec", "aiosqlite", "numba"]:
        logging.getLogger(noisy).setLevel(logging.WARNING)

    # Configurar formato y handler de consola
    formatter = ColoredFormatter('%(asctime)s - [%(name)s] %(message)s')
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Configurar handler de auditoría (archivo)
    # Usamos un formatter simple sin colores ANSI
    file_formatter = logging.Formatter('%(asctime)s - [%(name)s] [%(levelname)s] %(message)s')
    audit_handler = AuditLogHandler()
    audit_handler.setFormatter(file_formatter)
    root_logger.addHandler(audit_handler)

    # Bloquear propagación redundante
    logging.getLogger("uvicorn").propagate = False
    logging.getLogger("uvicorn.access").propagate = False
    logging.getLogger("AppLogger").info("Sistema de logging configurado")
