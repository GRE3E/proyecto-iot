from pydantic import BaseModel

class UserRegister(BaseModel):
    username: str
    password: str
    is_owner: bool = False

class UserLogin(BaseModel):
    username: str
    password: str