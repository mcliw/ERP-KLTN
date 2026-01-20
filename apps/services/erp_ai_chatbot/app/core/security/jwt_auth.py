from fastapi import Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from uuid import UUID

security = HTTPBearer()

JWT_SECRET = "CHANGE_ME"
JWT_ALGORITHM = "HS256"


class AuthUser:
    def __init__(self, user_id: UUID, role: str | None):
        self.user_id = user_id
        self.role = role
        self.is_authenticated = True


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = security,
) -> AuthUser:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = UUID(payload["user_id"])
        role = payload.get("role")
        return AuthUser(user_id=user_id, role=role)
    except (JWTError, KeyError, ValueError):
        raise PermissionError("Token không hợp lệ hoặc hết hạn")