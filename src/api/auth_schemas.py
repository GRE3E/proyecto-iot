from pydantic import BaseModel

class UserRegister(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str | None = None

class TokenRefresh(BaseModel):
    refresh_token: str

class OwnerRegister(BaseModel):
    username: str
    password: str
    is_owner: bool = True

class OwnerSummary(BaseModel):
    """Resumen de usuario propietario."""
    id: int
    username: str
    is_owner: bool = True

class OwnerListResponse(BaseModel):
    """Respuesta para la lista de propietarios."""
    owner_count: int
    owners: list[OwnerSummary]
    