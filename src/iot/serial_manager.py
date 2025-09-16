import serial
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class SerialManager:
    def __init__(self, port: str, baudrate: int = 9600):
        self.port = port
        self.baudrate = baudrate
        self.serial_connection = None
        self.is_connected = False
        self._connect()

    def _connect(self):
        try:
            self.serial_connection = serial.Serial(self.port, self.baudrate, timeout=1)
            self.is_connected = True
            logging.info(f"SerialManager: Conectado a {self.port} a {self.baudrate} baudios.")
        except serial.SerialException as e:
            logging.warning(f"SerialManager: No se pudo conectar al puerto {self.port}: {e}")
            self.is_connected = False

    def read_data(self) -> str:
        if self.is_connected and self.serial_connection.in_waiting > 0:
            try:
                data = self.serial_connection.readline().decode('utf-8').strip()
                if data:
                    logging.debug(f"SerialManager: Datos recibidos: {data}")
                return data
            except Exception as e:
                logging.error(f"SerialManager: Error al leer datos: {e}")
        return ""

    def send_command(self, cmd: str) -> bool:
        if self.is_connected:
            try:
                self.serial_connection.write(f"{cmd}\n".encode('utf-8'))
                logging.info(f"SerialManager: Comando enviado: {cmd}")
                return True
            except Exception as e:
                logging.error(f"SerialManager: Error al enviar comando: {e}")
        else:
            logging.warning("SerialManager: No conectado, no se pudo enviar el comando.")
        return False

    def close(self):
        if self.is_connected and self.serial_connection.is_open:
            self.serial_connection.close()
            self.is_connected = False
            logging.info(f"SerialManager: Conexión cerrada en {self.port}.")