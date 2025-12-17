import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger("AuditService")

class AuditService:
    """
    Servicio para manejar el registro de auditoría en archivos de texto diarios.
    """
    
    def __init__(self, log_dir: str = "logs/audit"):
        self.log_dir = Path(log_dir)
        self._ensure_log_dir()

    def _ensure_log_dir(self):
        """Asegura que el directorio de logs exista."""
        try:
            self.log_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.error(f"Error creando directorio de auditoría {self.log_dir}: {e}")

    def log_startup(self):
        """Registra el inicio del servidor con un separador visual."""
        separator = "=" * 50
        self._write_raw(f"\n{separator}\nSERVER STARTED AT {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n{separator}\n")

    def log_shutdown(self):
        """Registra el apagado del servidor."""
        separator = "-" * 50
        self._write_raw(f"\n{separator}\nSERVER STOPPED AT {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n{separator}\n")

    def write_raw_line(self, message: str):
        """Escribe una línea cruda al archivo de log (usado por el logger del sistema)."""
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            filename = self.log_dir / f"audit_{today}.txt"
            with open(filename, "a", encoding="utf-8") as f:
                f.write(message + "\n")
        except Exception as e:
            # Evitar bucle infinito de logs si falla el log
            print(f"CRITICAL ERROR: No se pudo escribir en audit log: {e}")

    def _write_raw(self, message: str):
        """Escribe un mensaje crudo sin salto de línea automático (interno)."""
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            filename = self.log_dir / f"audit_{today}.txt"
            with open(filename, "a", encoding="utf-8") as f:
                f.write(message)
        except Exception as e:
            print(f"CRITICAL ERROR: No se pudo escribir en audit log: {e}")

    def log_event(self, endpoint: str, request_body: Dict[str, Any], response_data: Dict[str, Any], status: str = "SUCCESS"):
        """
        Registra un evento en el archivo de log del día actual.
        """
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_message = (
                f"[{timestamp}] "
                f"ENDPOINT: {endpoint} | "
                f"STATUS: {status} | "
                f"REQUEST: {request_body} | "
                f"RESPONSE: {response_data}\n"
            )
            self._write_raw(log_message)
                
        except Exception as e:
             # Si falla el audit, no podemos loguearlo usando logger normal porque podría causar recursión
             # si el logger normal también intenta escribir en audit.
             print(f"Error logueando evento de auditoría: {e}")

# Instancia global
_audit_service = AuditService()

def get_audit_service():
    return _audit_service
