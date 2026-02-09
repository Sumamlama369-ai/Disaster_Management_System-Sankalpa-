"""
Gmail API Setup Script
Run this to authenticate Gmail for sending OTP emails
"""
import os
import sys
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


SCOPES = ['https://www.googleapis.com/auth/gmail.send']


def setup_gmail():
    """Setup Gmail API authentication"""
    print("=" * 60)
    print("  Gmail API Setup - Sankalpa")
    print("=" * 60)
    print()
    
    # Check if credentials.json exists
    if not os.path.exists('credentials.json'):
        print("✗ credentials.json not found!")
        print()
        print("Please ensure credentials.json is in the project root.")
        return False
    
    print("✓ credentials.json found")
    print()
    
    creds = None
    
    # Check if token already exists
    if os.path.exists('token.json'):
        print("✓ token.json already exists")
        print("  Gmail API is already authenticated!")
        print()
        
        choice = input("Do you want to re-authenticate? (y/n): ")
        if choice.lower() != 'y':
            print("Skipping authentication.")
            return True
        
        print()
        print("Removing old token...")
        os.remove('token.json')
    
    # Authenticate
    print("Starting Gmail authentication...")
    print()
    print("This will use port 8080")
    print("Make sure http://localhost:8080/ is in your Google Cloud Console")
    print()
    print("What will happen:")
    print("  1. Your browser will open")
    print("  2. Login with: sl2296450@gmail.com")
    print("  3. Click 'Advanced' if you see warning")
    print("  4. Click 'Go to Sankalpa (unsafe)'")
    print("  5. Click 'Allow' to grant permissions")
    print("  6. Return to this terminal")
    print()
    
    input("Press Enter to continue...")
    print()
    
    try:
        # Run OAuth flow with FIXED PORT 8080
        flow = InstalledAppFlow.from_client_secrets_file(
            'credentials.json',
            SCOPES
        )
        creds = flow.run_local_server(port=8080)  # FIXED PORT!
        
        # Save credentials
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
        
        print()
        print("=" * 60)
        print("  ✓ Gmail authentication successful!")
        print("=" * 60)
        print()
        print("Token saved to: token.json")
        print()
        
        # Test by building service
        service = build('gmail', 'v1', credentials=creds)
        print("✓ Gmail service initialized successfully!")
        print()
        
        return True
        
    except Exception as e:
        print()
        print(f"✗ Authentication failed: {e}")
        print()
        print("Common issues:")
        print("  1. http://localhost:8080/ not added to Google Cloud Console")
        print("  2. Wrong Gmail account (use sl2296450@gmail.com)")
        print("  3. Didn't click 'Allow'")
        print()
        return False


if __name__ == "__main__":
    success = setup_gmail()
    if success:
        print("=" * 60)
        print("  Setup Complete!")
        print("=" * 60)
        print()
        print("You can now:")
        print("  1. Start the server: python app/main.py")
        print("  2. Visit: http://localhost:8000")
        print("  3. API Docs: http://localhost:8000/docs")
        print()
    else:
        print("Please fix the errors and try again.")
