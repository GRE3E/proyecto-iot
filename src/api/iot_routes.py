from fastapi import APIRouter, HTTPException, Request
from src.api.iot_schemas import SerialCommand, SerialCommandResponse
import logging

# Importar módulos globales desde utils
from src.api import utils

iot_router = APIRouter()

@iot_router.post("/serial_command", response_model=SerialCommandResponse)
async def send_serial_command(request: Request, command: SerialCommand):
    """Envía un comando al puerto serial conectado (Arduino)."""
    app = request.app
    if not hasattr(app.state, "serial_manager") or not app.state.serial_manager or not app.state.serial_manager.is_connected:
        raise HTTPException(status_code=503, detail="SerialManager no está inicializado o conectado.")
    
    success = app.state.serial_manager.send_command(command.command)
    if success:
        return SerialCommandResponse(status="success", message=f"Comando '{command.command}' enviado al Arduino.")
    else:
        raise HTTPException(status_code=500, detail=f"Fallo al enviar el comando '{command.command}' al Arduino.")