from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class NotificationResponse(BaseModel):
    id: int
    timestamp: datetime
    type: str
    title: str
    message: str
    status: str

    class Config:
        from_attributes = True

class NotificationsListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    limit: int
    offset: int

class NotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    status: Optional[str] = "new"

class NotificationUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = None