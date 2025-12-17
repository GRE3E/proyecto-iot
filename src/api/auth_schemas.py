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

class MemberSummary(BaseModel):
    """Resumen de usuario no propietario (miembro)."""
    id: int
    username: str
    is_owner: bool = False

class UpdateUsernameRequest(BaseModel):
    new_username: str
    current_password: str

class UpdatePasswordRequest(BaseModel):
    new_password: str
    current_password: str

class VerifyPasswordRequest(BaseModel):
    current_password: str

class UserDeleteRequest(BaseModel):
    username: str

class UpdateMemberRoleRequest(BaseModel):
    username: str
    make_owner: bool
    new_password: str | None = None
    new_username: str | None = None
    
