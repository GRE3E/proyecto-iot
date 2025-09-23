from pydantic import BaseModel, Field
from typing import Optional


class SerialCommand(BaseModel):
    command: str = Field(..., example="LIGHT_ON")


class SerialCommandResponse(BaseModel):
    status: str = Field(..., example="success")
    message: str = Field(..., example="Comando 'LIGHT_ON' enviado al Arduino.")


class IoTCommandBase(BaseModel):
    name: str = Field(..., example="turn_on_living_room_light")
    description: Optional[str] = Field(None, example="Enciende la luz de la sala de estar")
    command_type: str = Field(..., example="serial" or "mqtt")
    command_payload: str = Field(..., example="LIGHT_ON" or "ON")
    mqtt_topic: Optional[str] = Field(None, example="home/lights/livingroom")


class IoTCommandCreate(IoTCommandBase):
    pass


class IoTCommand(IoTCommandBase):
    id: int

    class Config:
        from_attributes = True