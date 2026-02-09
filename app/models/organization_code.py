from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.database.database import Base

class OrganizationCode(Base):
    __tablename__ = "organization_code"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    organization_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)