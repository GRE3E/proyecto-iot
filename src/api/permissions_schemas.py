from pydantic import BaseModel
from typing import List, Optional

class PermissionBase(BaseModel):
    name: str

class PermissionCreate(PermissionBase):
    pass

class Permission(PermissionBase):
    id: int

    class Config:
        from_attributes = True

class UserPermissionBase(BaseModel):
    user_id: int
    permission_id: int

class UserPermissionCreate(UserPermissionBase):
    pass

class UserPermission(UserPermissionBase):
    id: Optional[int] = None # UserPermission no tiene su propio ID, pero es útil para Pydantic
    permission: Permission

    class Config:
        from_attributes = True