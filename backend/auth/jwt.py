"""
JWT utilities — create and verify access tokens
"""

from datetime import datetime, timedelta
from jose import JWTError, jwt
from config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def create_access_token(user_id: str, email: str, firm_name: str, is_admin: bool = False) -> str:
    """Create a signed JWT token valid for 7 days"""
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "email": email,
        "firm_name": firm_name,
        "is_admin": is_admin,
        "exp": expire,
    }
    return jwt.encode(payload, settings.app_secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and verify a JWT token.
    Returns the payload dict or raises JWTError.
    """
    return jwt.decode(token, settings.app_secret_key, algorithms=[ALGORITHM])
