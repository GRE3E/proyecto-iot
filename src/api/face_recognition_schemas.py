from pydantic import BaseModel
from typing import List


class HealthCheckResponse(BaseModel):
    status: str
    message: str


class AddFaceResponse(BaseModel):
    message: str


class ListFacesResponse(BaseModel):
    people: List[str]


class RecognizeFaceResponse(BaseModel):
    recognized: bool
    name: str
