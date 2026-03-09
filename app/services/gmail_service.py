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

    def send_report_status_email(self, to_email: str, name: str, report_id: int, 
                                  disaster_type: str, new_status: str, 
                                  officer_notes: str = "") -> bool:
        """
        Send disaster report status update notification email
        """
        if not self.service:
            print("❌ Gmail service not initialized")
            return False

        status_messages = {
            "REVIEWING": ("Under Review", "Your disaster report is now being reviewed by our response officers. A team member has been assigned to assess the situation.", "#2563eb", "🔍", "Reviewing"),
            "DISPATCHED": ("Help Dispatched", "A rescue team and/or drone has been dispatched to your reported location. Help is on the way!", "#7c3aed", "🚁", "Dispatched"),
            "RESCUING": ("Rescue In Progress", "Active rescue operations are underway at your reported location. Our teams are working to ensure everyone's safety.", "#ea580c", "🛟", "Rescuing"),
            "RESOLVED": ("Resolved", "Your disaster report has been resolved. Thank you for being a responsible citizen and helping your community.", "#059669", "✅", "Resolved"),
            "REJECTED": ("Report Rejected", "After careful review, your report could not be acted upon at this time. Please see the officer's notes below for details.", "#dc2626", "❌", "Rejected"),
            "PENDING": ("Pending Review", "Your report has been received and is waiting to be reviewed by our officers.", "#d97706", "⏳", "Pending"),
        }

        status_info = status_messages.get(new_status, ("Status Updated", f"Your report status has been changed to {new_status}.", "#64748b", "📋", new_status))
        status_title, status_desc, status_color, status_emoji, status_label = status_info

        subject = f"Sankalpa — Report #{report_id}: {status_emoji} {status_title}"

        # Build timeline steps
        timeline_steps = [
            ("PENDING", "Report Received", "⏳"),
            ("REVIEWING", "Under Review", "🔍"),
            ("DISPATCHED", "Help Dispatched", "🚁"),
            ("RESOLVED", "Resolved", "✅"),
        ]
        status_order = {"PENDING": 0, "REVIEWING": 1, "DISPATCHED": 2, "RESCUING": 2, "RESOLVED": 3, "REJECTED": 3}
        current_step = status_order.get(new_status, 0)

        timeline_html = ""
        for i, (key, label, emoji) in enumerate(timeline_steps):
            if i <= current_step:
                bg = status_color if i == current_step else "#059669"
                text_color = "#fff"
                line_color = "#059669"
            else:
                bg = "#e2e8f0"
                text_color = "#94a3b8"
                line_color = "#e2e8f0"
            
            circle_html = f'<div style="width:40px;height:40px;border-radius:50%;background:{bg};display:flex;align-items:center;justify-content:center;font-size:18px;margin:0 auto;">{emoji}</div>'
            label_html = f'<div style="font-size:11px;font-weight:600;color:{text_color if i <= current_step else "#94a3b8"};margin-top:6px;text-align:center;">{label}</div>'
            
            connector = ""
            if i < len(timeline_steps) - 1:
                connector = f'<div style="flex:1;height:3px;background:{line_color};margin:0 4px;align-self:center;margin-top:-16px;"></div>'
            
            timeline_html += f'<div style="display:flex;flex-direction:column;align-items:center;flex:0 0 auto;">{circle_html}{label_html}</div>{connector}'

        notes_section = ""
        if officer_notes:
            notes_section = f"""
                <div style="margin:24px 0;background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%);border-left:4px solid #0284c7;border-radius:0 12px 12px 0;padding:20px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <span style="font-size:18px;">📝</span>
                        <strong style="color:#0369a1;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Officer Notes</strong>
                    </div>
                    <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">{officer_notes}</p>
                </div>
            """

        disaster_emoji_map = {
            "fire": "🔥", "flood": "🌊", "earthquake": "🌍", "landslide": "⛰️", "storm": "🌪️"
        }
        d_emoji = disaster_emoji_map.get(disaster_type.lower(), "⚠️")

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;padding:20px;">
                
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#334155 100%);border-radius:16px 16px 0 0;padding:32px 30px;text-align:center;">
                    <div style="font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Disaster Management System</div>
                    <div style="font-size:32px;font-weight:800;color:#fff;letter-spacing:1px;">🚨 SANKALPA</div>
                    <div style="width:60px;height:3px;background:linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899);margin:12px auto 0;border-radius:2px;"></div>
                </div>

                <!-- Status Banner -->
                <div style="background:{status_color};padding:20px 30px;text-align:center;">
                    <span style="font-size:36px;">{status_emoji}</span>
                    <div style="font-size:22px;font-weight:800;color:#fff;margin-top:6px;letter-spacing:0.5px;">{status_title}</div>
                </div>
                
                <!-- Main Content -->
                <div style="background:#ffffff;padding:30px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
                    
                    <p style="font-size:16px;color:#1e293b;margin:0 0 4px;">Hello <strong>{name}</strong>,</p>
                    <p style="font-size:14px;color:#64748b;line-height:1.7;margin:4px 0 24px;">{status_desc}</p>
                    
                    <!-- Report Card -->
                    <div style="background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
                        <div style="display:flex;align-items:center;margin-bottom:16px;">
                            <span style="font-size:28px;margin-right:12px;">{d_emoji}</span>
                            <div>
                                <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Report #{report_id}</div>
                                <div style="font-size:18px;font-weight:700;color:#1e293b;text-transform:capitalize;">{disaster_type}</div>
                            </div>
                        </div>
                        <div style="display:flex;gap:10px;">
                            <div style="flex:1;background:#fff;border-radius:8px;padding:12px;text-align:center;border:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Status</div>
                                <div style="font-size:14px;font-weight:700;color:{status_color};margin-top:4px;">{status_label}</div>
                            </div>
                            <div style="flex:1;background:#fff;border-radius:8px;padding:12px;text-align:center;border:1px solid #e2e8f0;">
                                <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Type</div>
                                <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:4px;text-transform:capitalize;">{disaster_type}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Status Timeline -->
                    <div style="margin-bottom:24px;">
                        <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">Progress Timeline</div>
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:0 10px;">
                            {timeline_html}
                        </div>
                    </div>

                    {notes_section}

                    <!-- CTA -->
                    <div style="text-align:center;margin:28px 0 8px;">
                        <div style="font-size:13px;color:#94a3b8;margin-bottom:12px;">Track your report status anytime on the Sankalpa portal</div>
                    </div>

                    <!-- Safety Tip -->
                    <div style="background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);border:1px solid #fcd34d;border-radius:12px;padding:16px;margin-top:16px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:20px;">🛡️</span>
                            <strong style="color:#92400e;font-size:13px;">Safety Reminder</strong>
                        </div>
                        <p style="margin:8px 0 0;font-size:13px;color:#78350f;line-height:1.6;">
                            Stay calm and move to a safe location. Do not return to the affected area until cleared by authorities.
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="text-align:center;padding:24px 0 8px;">
                    <div style="font-size:13px;color:#64748b;font-weight:600;">Sankalpa — Disaster Management System</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:6px;">This is an automated notification. Please do not reply to this email.</div>
                    <div style="font-size:11px;color:#cbd5e1;margin-top:8px;">&copy; 2024 Sankalpa. Protecting communities together.</div>
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
            print(f"✓ Report status email sent to {to_email}")
            return True
        except Exception as e:
            print(f"✗ Failed to send report status email: {e}")
            if "invalid_grant" in str(e) or "Token has been expired" in str(e):
                self._load_credentials()
                try:
                    self.service.users().messages().send(
                        userId='me',
                        body={'raw': raw_message}
                    ).execute()
                    print(f"✓ Report status email sent to {to_email} (after refresh)")
                    return True
                except:
                    print(f"❌ Still failed after refresh.")
            return False


# Singleton instance
gmail_service = GmailService()