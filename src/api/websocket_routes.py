from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.websocket.connection_manager import manager
import logging

logger = logging.getLogger("APIRoutes")

websocket_router = APIRouter()

@websocket_router.websocket("/ws/{client_id}")
async def websocket_general_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Mensaje recibido de {client_id}: {data}")
            await manager.send_personal_message(f"Tú escribiste: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"Cliente #{client_id} desconectado")
