from pydantic import BaseModel, Field
from typing import Dict, Any
from datetime import datetime

class ArduinoCommandSend(BaseModel):
    mqtt_topic: str = Field(..., example="iot/lights/LIGHT_GARAJE/command")
    command_payload: str = Field(..., example="ON")

class DeviceStateBase(BaseModel):
    device_name: str = Field(..., example="luz_sala")
    device_type: str = Field(..., example="luz")
    state_json: Dict[str, Any] = Field(..., example={"status": "ON"})

class DeviceStateCreate(DeviceStateBase):
    pass

class DeviceState(DeviceStateBase):
    id: int
    last_updated: datetime

    class Config:
        from_attributes = True

class IoTCommandCreate(BaseModel):
    name: str = Field(..., example="Encender Luz Garaje")
    description: str | None = Field(None, example="Enciende la luz del garaje.")
    command_type: str = Field(..., example="mqtt")
    command_payload: str = Field(..., example="ON")
    mqtt_topic: str | None = Field(None, example="iot/lights/LIGHT_GARAJE/command")

class IoTCommand(IoTCommandCreate):
    id: int

    class Config:
        from_attributes = True
    