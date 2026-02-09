"""
Security utilities for password hashing and JWT tokens
"""
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings
import secrets
import string
import hashlib


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password):
    """Hash a password - uses SHA256 for short strings like OTP"""
    if len(password) <= 10:
        salt = secrets.token_hex(16)
        hashed = hashlib.sha256(f"{password}{salt}".encode()).hexdigest()
        return f"{salt}${hashed}"
    else:
        return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    """Verify password against hash"""
    if '$' in hashed_password and len(hashed_password.split('$')) == 2:
        try:
            salt, stored_hash = hashed_password.split('$')
            computed_hash = hashlib.sha256(f"{plain_password}{salt}".encode()).hexdigest()
            return computed_hash == stored_hash
        except:
            return False
    else:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except:
            return False


def create_access_token(data):
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_token(token):
    """Decode JWT token"""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except:
        return None


def generate_otp():
    """Generate random 6-digit OTP"""
    return ''.join(secrets.choice(string.digits) for _ in range(settings.OTP_LENGTH))


def verify_organization_code(code):
    """Check if organization code is valid"""
    valid_codes = [
        settings.ORG_CODE_NDRF,
        settings.ORG_CODE_FIRE,
        settings.ORG_CODE_POLICE
    ]
    return code in valid_codes


def verify_master_admin_code(code):
    """Check if master admin code is valid"""
    return code == settings.MASTER_ADMIN_CODE