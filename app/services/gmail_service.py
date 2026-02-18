"""
Gmail Service - Send OTP emails
Uses Gmail API to send verification emails with automatic token refresh
"""
import base64
import os
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from app.core.config import settings

SCOPES = ['https://www.googleapis.com/auth/gmail.send']
TOKEN_FILE = 'token.json'
CREDENTIALS_FILE = 'credentials.json'


class GmailService:
    """Gmail API service for sending emails with auto-refresh"""
    
    def __init__(self):
        self.creds = None
        self.service = None
        self._load_credentials()
    
    def _load_credentials(self):
        """Load Gmail API credentials with automatic token refresh"""
        try:
            # Load existing token
            if os.path.exists(TOKEN_FILE):
                self.creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
                print(f"✓ Loaded existing token from {TOKEN_FILE}")
            
            # Check if token is valid
            if self.creds and self.creds.valid:
                print("✓ Token is valid")
                self.service = build('gmail', 'v1', credentials=self.creds)
                return
            
            # Try to refresh expired token
            if self.creds and self.creds.expired and self.creds.refresh_token:
                try:
                    print("🔄 Token expired, refreshing...")
                    self.creds.refresh(Request())
                    print("✓ Token refreshed successfully")
                    
                    # Save refreshed token
                    with open(TOKEN_FILE, 'w') as token:
                        token.write(self.creds.to_json())
                    print(f"✓ Refreshed token saved to {TOKEN_FILE}")
                    
                    self.service = build('gmail', 'v1', credentials=self.creds)
                    return
                    
                except Exception as refresh_error:
                    print(f"❌ Token refresh failed: {refresh_error}")
                    print(f"⚠️ Please delete {TOKEN_FILE} and run: python scripts/setup_gmail.py")
                    self.creds = None
            
            # Create new token if needed
            if not self.creds or not self.creds.valid:
                if not os.path.exists(CREDENTIALS_FILE):
                    print(f"❌ {CREDENTIALS_FILE} not found!")
                    print("Please download it from Google Cloud Console")
                    print("Or run: python scripts/setup_gmail.py")
                    return
                
                print("🔐 Starting OAuth flow...")
                print("📍 Your browser will open for authentication...")
                
                flow = InstalledAppFlow.from_client_secrets_file(
                    CREDENTIALS_FILE,
                    SCOPES
                )
                self.creds = flow.run_local_server(port=8080)
                print("✓ OAuth completed successfully")
                
                # Save new token
                with open(TOKEN_FILE, 'w') as token:
                    token.write(self.creds.to_json())
                print(f"✓ New token saved to {TOKEN_FILE}")
                
                self.service = build('gmail', 'v1', credentials=self.creds)
                
        except Exception as e:
            print(f"❌ Failed to load Gmail credentials: {e}")
            print("Run: python scripts/setup_gmail.py")
    
    def send_otp_email(self, to_email: str, otp: str, name: str = "User") -> bool:
        """
        Send OTP verification email
        
        Args:
            to_email: Recipient email
            otp: 6-digit OTP code
            name: Recipient name
            
        Returns:
            True if sent successfully
        """
        if not self.service:
            print("❌ Gmail service not initialized")
            print("⚠️ Please run: python scripts/setup_gmail.py")
            return False
        
        subject = "Sankalpa - Verify Your Email"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                           color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .otp-box {{ background: white; border: 3px dashed #667eea; border-radius: 10px;
                           padding: 20px; text-align: center; margin: 20px 0; }}
                .otp-code {{ font-size: 36px; font-weight: bold; color: #667eea; 
                            letter-spacing: 8px; }}
                .warning {{ background: #fff3cd; border-left: 4px solid #ffc107;
                           padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚨 Sankalpa</h1>
                    <p>Disaster Management System</p>
                </div>
                <div class="content">
                    <h2>Hello {name}! 👋</h2>
                    <p>Thank you for registering with Sankalpa. To complete your registration, 
                       please use the following One-Time Password (OTP):</p>
                    
                    <div class="otp-box">
                        <div class="otp-code">{otp}</div>
                    </div>
                    
                    <p>This OTP is valid for <strong>{settings.OTP_EXPIRY_MINUTES} minutes</strong>.</p>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        <ul>
                            <li>Never share this OTP with anyone</li>
                            <li>Our team will never ask for your OTP</li>
                            <li>If you didn't request this, please ignore this email</li>
                        </ul>
                    </div>
                    
                    <p>Stay safe! 🛡️</p>
                    <p><strong>Sankalpa Team</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply.</p>
                    <p>&copy; 2024 Sankalpa - Disaster Management System</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        message = MIMEText(html_body, 'html')
        message['to'] = to_email
        message['from'] = settings.SENDER_EMAIL
        message['subject'] = subject

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        try:
            self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()

            print(f"✓ OTP email sent to {to_email}")
            return True

        except Exception as e:
            print(f"✗ Failed to send email: {e}")
            
            # If error is about invalid token, try to refresh
            if "invalid_grant" in str(e) or "Token has been expired" in str(e):
                print("🔄 Token appears invalid, attempting to refresh service...")
                self._load_credentials()  # Try to refresh
                
                # Retry sending
                try:
                    self.service.users().messages().send(
                        userId='me',
                        body={'raw': raw_message}
                    ).execute()
                    print(f"✓ OTP email sent to {to_email} (after refresh)")
                    return True
                except:
                    print(f"❌ Still failed after refresh. Please delete {TOKEN_FILE} and restart.")
            
            return False


# Singleton instance
gmail_service = GmailService()