from pydantic import BaseModel
from typing import List

# --- Health Check ---
class HealthCheckResponse(BaseModel):
    status: str
    message: str

# --- Add Face Response ---
class AddFaceResponse(BaseModel):
    message: str

# --- List Faces Response ---
class ListFacesResponse(BaseModel):
    people: List[str]

# --- Recognize Face Response ---
class RecognizeFaceResponse(BaseModel):
    recognized: bool
    name: str
