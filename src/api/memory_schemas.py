from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from src.api.routines_schemas import RoutineResponse

class MemoryStatusResponse(BaseModel):
    total_routines: int
    confirmed: int
    pending: int
    enabled: int
    routines: List[RoutineResponse]

class UserPatternsResponse(BaseModel):
    time_patterns: Optional[List[Dict[str, Any]]] = None
    location_patterns: Optional[List[Dict[str, Any]]] = None
    repeated_action_patterns: Optional[List[Dict[str, Any]]] = None
    
    class Config:
        extra = "allow"
