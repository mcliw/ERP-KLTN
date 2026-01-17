from pydantic import BaseModel

class AuthContext(BaseModel):
    user_id: int | None = None
    role: str | None = None
    is_authenticated: bool = False
