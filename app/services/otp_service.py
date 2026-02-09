"""
OTP Service
Handles OTP generation, storage, and verification
"""
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.otp import OTP
from app.core.security import hash_password, verify_password, generate_otp
from app.core.config import settings


class OTPService:
    """OTP management service"""
    
    @staticmethod
    def create_otp(db, email):
        """Create new OTP for email"""
        # Generate OTP
        otp_code = generate_otp()
        
        # Hash OTP before storing
        hashed_otp = hash_password(otp_code)
        
        # Create OTP record
        db_otp = OTP(
            email=email,
            otp_code=hashed_otp,
            expires_at=OTP.calculate_expiry()
        )
        
        db.add(db_otp)
        db.commit()
        db.refresh(db_otp)
        
        print(f"✓ OTP created for {email}")
        return otp_code
    
    @staticmethod
    def verify_otp(db, email, otp_code):
        """Verify OTP code"""
        # Get latest unused OTP
        db_otp = db.query(OTP).filter(
            OTP.email == email,
            OTP.is_used == False
        ).order_by(OTP.created_at.desc()).first()
        
        if not db_otp:
            print(f"✗ No OTP found for {email}")
            return False
        
        # Check if expired
        now = datetime.utcnow()
        if now > db_otp.expires_at:
            print(f"✗ OTP expired for {email}")
            return False
        
        # Check attempts
        if db_otp.attempts >= settings.MAX_OTP_ATTEMPTS:
            print(f"✗ Too many attempts for {email}")
            return False
        
        # Increment attempts
        db_otp.attempts += 1
        
        # Verify OTP
        if verify_password(otp_code, db_otp.otp_code):
            db_otp.is_used = True
            db.commit()
            print(f"✓ OTP verified for {email}")
            return True
        else:
            db.commit()
            print(f"✗ Invalid OTP for {email} (Attempt {db_otp.attempts}/3)")
            return False
    
    @staticmethod
    def get_otp_status(db, email):
        """Get OTP status for email"""
        db_otp = db.query(OTP).filter(
            OTP.email == email,
            OTP.is_used == False
        ).order_by(OTP.created_at.desc()).first()
        
        if not db_otp:
            return {
                'exists': False,
                'is_valid': False,
                'attempts': 0,
                'remaining_attempts': 0
            }
        
        now = datetime.utcnow()
        is_valid = not db_otp.is_used and now <= db_otp.expires_at
        
        return {
            'exists': True,
            'is_valid': is_valid,
            'attempts': db_otp.attempts,
            'remaining_attempts': max(0, settings.MAX_OTP_ATTEMPTS - db_otp.attempts)
        }


# Singleton instance
otp_service = OTPService()