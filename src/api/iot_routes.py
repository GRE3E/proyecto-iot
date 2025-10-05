from fastapi import APIRouter, HTTPException, Request, Depends, status
from sqlalchemy.orm import Session
from typing import List
from src.api.iot_schemas import SerialCommand, SerialCommandResponse, IoTCommandCreate, IoTCommand, IoTDashboardData
from src.db.database import get_db
from src.db import models
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

@iot_router.get("/dashboard_data", response_model=IoTDashboardData)
async def get_iot_dashboard_data(request: Request):
    """
    Obtiene los datos actuales del dashboard IoT, incluyendo estados de dispositivos y lecturas de sensores.
    """
    app = request.app
    if not hasattr(app.state, "iot_data"):
        raise HTTPException(status_code=500, detail="Los datos IoT no están inicializados.")
    return IoTDashboardData(data=app.state.iot_data)

@iot_router.post("/commands", response_model=List[IoTCommand], status_code=status.HTTP_201_CREATED)
def create_iot_commands(commands: List[IoTCommandCreate], db: Session = Depends(get_db)):
    created_commands = []
    for command in commands:
        db_command = models.IoTCommand(name=command.name, description=command.description, 
                                       command_type=command.command_type, command_payload=command.command_payload,
                                       mqtt_topic=command.mqtt_topic)
        db.add(db_command)
        created_commands.append(db_command)
    db.commit()
    for cmd in created_commands:
        db.refresh(cmd)
    return created_commands

@iot_router.get("/commands", response_model=List[IoTCommand])
def read_iot_commands(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    commands = db.query(models.IoTCommand).offset(skip).limit(limit).all()
    return commands

@iot_router.get("/commands/{command_id}", response_model=IoTCommand)
def read_iot_command(command_id: int, db: Session = Depends(get_db)):
    command = db.query(models.IoTCommand).filter(models.IoTCommand.id == command_id).first()
    if command is None:
        raise HTTPException(status_code=404, detail="Command not found")
    return command

@iot_router.put("/commands/{command_id}", response_model=IoTCommand)
def update_iot_command(command_id: int, command: IoTCommandCreate, db: Session = Depends(get_db)):
    db_command = db.query(models.IoTCommand).filter(models.IoTCommand.id == command_id).first()
    if db_command is None:
        raise HTTPException(status_code=404, detail="Command not found")
    
    db_command.name = command.name
    db_command.description = command.description
    db_command.command_type = command.command_type
    db_command.command_payload = command.command_payload
    db_command.mqtt_topic = command.mqtt_topic
    
    db.commit()
    db.refresh(db_command)
    return db_command

@iot_router.delete("/commands/{command_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_iot_command(command_id: int, db: Session = Depends(get_db)):
    db_command = db.query(models.IoTCommand).filter(models.IoTCommand.id == command_id).first()
    if db_command is None:
        raise HTTPException(status_code=404, detail="Command not found")
    
    db.delete(db_command)
    db.commit()
    return {"ok": True}