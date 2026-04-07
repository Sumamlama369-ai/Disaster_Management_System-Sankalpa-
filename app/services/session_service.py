"""
Session Service
Handles server-side session creation, validation, refresh, and destruction
"""
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.session import UserSession
from app.models.user import User
from app.core.config import settings


class SessionService:
    """Manages server-side sessions"""

    @staticmethod
    def create_session(db: Session, user_id: int) -> str:
        """
        Create a new session for the user.
        Returns the session_id to be stored in a cookie.
        """
        session_id = secrets.token_urlsafe(64)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES)

        db_session = UserSession(
            session_id=session_id,
            user_id=user_id,
            is_active=True,
            expires_at=expires_at,
            last_activity=datetime.now(timezone.utc),
        )
        db.add(db_session)
        db.commit()

        return session_id

    @staticmethod
    def validate_session(db: Session, session_id: str):
        """
        Validate a session and return the associated user.
        Also refreshes the session expiry (sliding expiration).
        Returns the User or None if session is invalid/expired.
        """
        db_session = (
            db.query(UserSession)
            .filter(
                UserSession.session_id == session_id,
                UserSession.is_active == True,
            )
            .first()
        )

        if not db_session:
            return None

        # Check if expired
        if db_session.expires_at < datetime.now(timezone.utc):
            db_session.is_active = False
            db.commit()
            return None

        # Sliding expiration: refresh expiry on every valid request
        db_session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES)
        db_session.last_activity = datetime.now(timezone.utc)
        db.commit()

        # Return the user
        user = db.query(User).filter(User.id == db_session.user_id).first()
        return user

    @staticmethod
    def destroy_session(db: Session, session_id: str) -> bool:
        """
        Destroy a session (logout).
        Returns True if session was found and destroyed.
        """
        db_session = (
            db.query(UserSession)
            .filter(UserSession.session_id == session_id)
            .first()
        )

        if not db_session:
            return False

        db_session.is_active = False
        db.commit()
        return True

    @staticmethod
    def destroy_all_user_sessions(db: Session, user_id: int) -> int:
        """
        Destroy all active sessions for a user (logout from all devices).
        Returns count of destroyed sessions.
        """
        count = (
            db.query(UserSession)
            .filter(
                UserSession.user_id == user_id,
                UserSession.is_active == True,
            )
            .update({"is_active": False})
        )
        db.commit()
        return count

    @staticmethod
    def cleanup_expired_sessions(db: Session) -> int:
        """
        Remove expired sessions from the database.
        Can be called periodically as a maintenance task.
        """
        count = (
            db.query(UserSession)
            .filter(UserSession.expires_at < datetime.now(timezone.utc))
            .delete()
        )
        db.commit()
        return count


# Singleton instance
session_service = SessionService()
