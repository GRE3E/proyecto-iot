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
    