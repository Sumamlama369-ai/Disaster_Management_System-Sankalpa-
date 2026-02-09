"""
Database Setup Script
Run this to create all tables in PostgreSQL
"""
import sys
sys.path.append('.')

from app.database.database import init_db, engine
from app.models.user import User
from app.models.otp import OTP
from app.models.org_code import OrganizationCode
from sqlalchemy import text


def setup_database():
    """Setup database tables"""
    print("=" * 60)
    print("  Database Setup - Sankalpa")
    print("=" * 60)
    print()
    
    # Test connection
    print("Testing database connection...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        print("✓ Database connection successful!")
        print(f"  Database: {engine.url.database}")
        print()
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        print()
        print("Make sure:")
        print("  1. PostgreSQL is running")
        print("  2. Database 'Sankalpa' exists")
        print("  3. Username/password is correct in .env")
        return False
    
    # Create tables
    print("Creating database tables...")
    try:
        init_db()
        print()
        print("Tables created:")
        print("  ✓ users")
        print("  ✓ otps")
        print("  ✓ organization_codes")
        print()
        print("=" * 60)
        print("  ✓ Database setup complete!")
        print("=" * 60)
        print()
        return True
    except Exception as e:
        print(f"✗ Error creating tables: {e}")
        return False


if __name__ == "__main__":
    success = setup_database()
    if success:
        print("Next step: Run 'python scripts/setup_gmail.py'")
    else:
        print("Please fix the errors and try again.")