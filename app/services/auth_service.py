"""
Authentication Service
Handles user registration, login, and authentication logic
"""
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.core.security import (
    verify_organization_code, 
    verify_master_admin_code,
    create_access_token
)
from app.services.gmail_service import gmail_service
from app.services.google_oauth_service import google_oauth
from app.services.otp_service import otp_service
from typing import Optional, Dict


class AuthService:
    """Authentication service"""
    
    @staticmethod
    def register_user(
        db: Session,
        google_token: str,
        role: str,
        organization_code: Optional[str] = None,
        master_admin_code: Optional[str] = None
    ) -> Dict:
        """
        Register new user with Google OAuth
        
        Args:
            db: Database session
            google_token: Google ID token
            role: User role (citizen/officer/admin)
            organization_code: Required for officer role
            master_admin_code: Required for admin role
            
        Returns:
            {
                'success': bool,
                'message': str,
                'email': str (if success)
            }
        """
        # Verify Google token
        user_info = google_oauth.verify_token(google_token)
        if not user_info:
            return {'success': False, 'message': 'Invalid Google token'}
        
        email = user_info['email']
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            return {'success': False, 'message': 'User already registered'}
        
        # Validate role-specific requirements
        role_enum = UserRole(role)
        
        if role_enum == UserRole.OFFICER:
            if not organization_code or not verify_organization_code(organization_code):
                return {'success': False, 'message': 'Invalid organization code'}
        
        if role_enum == UserRole.ADMIN:
            if not master_admin_code or not verify_master_admin_code(master_admin_code):
                return {'success': False, 'message': 'Invalid master admin code'}
        
        # Create user (not verified yet)
        new_user = User(
            email=email,
            google_id=user_info['google_id'],
            name=user_info['name'],
            role=role_enum,
            profile_picture=user_info.get('picture'),
            organization_code=organization_code if role_enum == UserRole.OFFICER else None,
            is_verified=False
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Generate and send OTP
        otp_code = otp_service.create_otp(db, email)
        gmail_service.send_otp_email(email, otp_code, user_info['name'])
        
        print(f"✓ User registered: {email} ({role})")
        
        return {
            'success': True,
            'message': 'OTP sent to your email',
            'email': email
        }
    
    @staticmethod
    def verify_otp_and_login(db: Session, email: str, otp_code: str) -> Dict:
        """
        Verify OTP and complete registration
        
        Returns:
            {
                'success': bool,
                'message': str,
                'access_token': str (if success),
                'user': dict (if success)
            }
        """
        # Verify OTP
        if not otp_service.verify_otp(db, email, otp_code):
            return {'success': False, 'message': 'Invalid or expired OTP'}
        
        # Get user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return {'success': False, 'message': 'User not found'}
        
        # Mark user as verified
        user.is_verified = True  # type: ignore
        db.commit()
        
        # Generate JWT token
        access_token = create_access_token({
            'user_id': user.id,
            'email': user.email,
            'role': user.role.value
        })
        
        print(f"✓ User verified and logged in: {email}")
        
        return {
            'success': True,
            'message': 'Login successful',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'role': user.role.value,
                'profile_picture': user.profile_picture
            }
        }
    
    @staticmethod
    def login_user(db: Session, google_token: str) -> Dict:
        """
        Login existing user with Google OAuth
        
        Returns:
            {
                'success': bool,
                'message': str,
                'access_token': str (if verified),
                'email': str (if needs OTP),
                'needs_verification': bool
            }
        """
        # Verify Google token
        user_info = google_oauth.verify_token(google_token)
        if not user_info:
            return {'success': False, 'message': 'Invalid Google token'}
        
        email = user_info['email']
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return {'success': False, 'message': 'User not found. Please register first.'}
        
        # Check if verified
        if not bool(user.is_verified):  # type: ignore
            # Send new OTP
            otp_code = otp_service.create_otp(db, email)
            gmail_service.send_otp_email(email, otp_code, str(user.name))  # type: ignore
            
            return {
                'success': False,
                'message': 'Account not verified. OTP sent to your email.',
                'email': email,
                'needs_verification': True
            }
        
        # Check if active
        if not bool(user.is_active):  # type: ignore
            return {'success': False, 'message': 'Account is inactive'}
        
        # Generate JWT token
        access_token = create_access_token({
            'user_id': user.id,
            'email': user.email,
            'role': user.role.value
        })
        
        print(f"✓ User logged in: {email}")
        
        return {
            'success': True,
            'message': 'Login successful',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'role': user.role.value,
                'profile_picture': user.profile_picture
            }
        }


# Singleton instance
auth_service = AuthService()