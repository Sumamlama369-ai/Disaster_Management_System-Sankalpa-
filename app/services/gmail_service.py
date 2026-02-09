"""
Gmail Service - Send OTP emails
Uses Gmail API to send verification emails
"""
import base64
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.core.config import settings


class GmailService:
    """Gmail API service for sending emails"""
    
    def __init__(self):
        self.creds = None
        self.service = None
        self._load_credentials()
    
    def _load_credentials(self):
        """Load Gmail API credentials from token.json"""
        try:
            self.creds = Credentials.from_authorized_user_file('token.json')
            self.service = build('gmail', 'v1', credentials=self.creds)
        except Exception as e:
            print(f"Warning: Gmail credentials not loaded: {e}")
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
            print("Gmail service not initialized")
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
        
        try:
            message = MIMEText(html_body, 'html')
            message['to'] = to_email
            message['from'] = settings.SENDER_EMAIL
            message['subject'] = subject
            
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            print(f"✓ OTP email sent to {to_email}")
            return True
            
        except Exception as e:
            print(f"✗ Failed to send email: {e}")
            return False


# Singleton instance
gmail_service = GmailService()