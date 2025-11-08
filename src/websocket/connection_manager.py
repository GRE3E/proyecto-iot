from typing import List
from fastapi import WebSocket
import logging

logger = logging.getLogger("Websocket")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Cliente conectado: {websocket.client}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"Cliente desconectado: {websocket.client}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
        logger.debug(f"Mensaje personal enviado a {websocket.client}: {message}")

    async def broadcast(self, message: str):
        logger.info(f"Broadcast de mensaje: {message}")
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()
