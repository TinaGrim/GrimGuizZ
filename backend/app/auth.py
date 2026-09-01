from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(plaintext: str) -> str:
    return pwd_context.hash(plaintext)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        # passlib + bcrypt 4.x version incompatibilities should not silently pass
        return False


def _encode(subject: str, role: str, minutes: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode(credentials: HTTPAuthorizationCredentials | None) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        return jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def create_access_token(subject: str) -> str:
    return _encode(subject, "teacher", settings.jwt_expire_minutes)


def create_student_token(student_id: str) -> str:
    return _encode(student_id, "student", settings.student_jwt_expire_minutes)


async def get_current_teacher(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    payload = _decode(credentials)
    if payload.get("role") != "teacher":
        raise HTTPException(status_code=401, detail="Invalid token")
    teacher_id = payload.get("sub")
    if teacher_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return teacher_id


async def get_current_student(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    payload = _decode(credentials)
    if payload.get("role") != "student":
        raise HTTPException(status_code=401, detail="Invalid token")
    student_id = payload.get("sub")
    if student_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return student_id
