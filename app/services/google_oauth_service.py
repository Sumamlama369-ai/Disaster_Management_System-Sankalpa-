"""
Google OAuth Service
Verifies Google ID tokens and extracts user information
"""
from google.oauth2 import id_token
from google.auth.transport import requests
from app.core.config import settings
from typing import Optional, Dict


class GoogleOAuthService:
    """Google OAuth token verification"""
    
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """
        Verify Google ID token and extract user info
        
        Args:
            token: Google ID token from frontend
            
        Returns:
            User info dict or None if invalid
            {
                'email': 'user@example.com',
                'name': 'John Doe',
                'google_id': '1234567890',
                'picture': 'https://...'
            }
        """
        try:
            # Verify token with Google
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                self.client_id
            )
            
            # Extract user information
            user_info = {
                'email': idinfo.get('email'),
                'name': idinfo.get('name'),
                'google_id': idinfo.get('sub'),
                'picture': idinfo.get('picture')
            }
            
            print(f"✓ Google token verified for: {user_info['email']}")
            return user_info
            
        except ValueError as e:
            print(f"✗ Invalid Google token: {e}")
            return None
        except Exception as e:
            print(f"✗ Token verification error: {e}")
            return None


# Singleton instance
google_oauth = GoogleOAuthService()