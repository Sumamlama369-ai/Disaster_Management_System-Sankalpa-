"""
Organization Code model - stores valid organization codes
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from datetime import datetime, timezone
from app.database.database import Base
from typing import cast


class OrganizationCode(Base):
    """Organization codes table"""
    __tablename__ = "organization_code"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    max_uses = Column(Integer, nullable=True)  # None = unlimited
    current_uses = Column(Integer, default=0)
    created_by = Column(Integer, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    @property
    def is_expired(self) -> bool:
        """Check if code has expired"""
        if self.expires_at is None:
            return False
        expires_at = self.expires_at.replace(tzinfo=None) if self.expires_at.tzinfo else self.expires_at
        return bool(datetime.now(timezone.utc) > expires_at)
    
    @property
    def is_usable(self) -> bool:
        """Check if code can be used"""
        is_active = cast(bool, self.is_active)
        if not is_active:
            return False
        if self.is_expired:
            return False
        max_uses_val = cast(int, self.max_uses) if self.max_uses is not None else float('inf')
        current_uses_val = cast(int, self.current_uses) if self.current_uses is not None else 0
        if current_uses_val >= max_uses_val:
            return False
        return True