from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class IoTCommandBase(BaseModel):
    name: str = Field(..., example="turn_on_living_room_light")
    description: Optional[str] = Field(None, example="Enciende la luz de la sala de estar")
    command_type: str = Field(..., example="mqtt")
    command_payload: str = Field(..., example="LIGHT_ON" or "ON")
    mqtt_topic: Optional[str] = Field(None, example="home/lights/livingroom")


class IoTCommandCreate(IoTCommandBase):
    pass


class IoTCommand(IoTCommandBase):
    id: int

    class Config:
        from_attributes = True


class IoTDashboardData(BaseModel):
    data: Dict[str, Any] = Field(..., example={
        "LIGHT_8": {"status": "ON", "timestamp": 1678886400.0},
        "TEMP_SENSOR_1": {"value": "25.5", "timestamp": 1678886405.0}
    })