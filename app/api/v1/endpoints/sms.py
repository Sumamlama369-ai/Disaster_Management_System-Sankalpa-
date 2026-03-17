"""
SMS Alert API Endpoints
Routes for sending disaster alert SMS via Aakash SMS API (Nepal)
Admin only access
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
import httpx
from datetime import datetime

from app.database.database import get_db
from app.models.user import User
from app.api.v1.dependencies.auth import get_current_admin
from app.core.config import settings

router = APIRouter()

AAKASH_SMS_API_URL = "https://sms.aakashsms.com/sms/v3/send"


# ─── Schemas ──────────────────────────────────────────────────

class SendSMSRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=10, description="10-digit Nepali phone number")
    message: str = Field(..., min_length=1, max_length=500, description="SMS message text")
    alert_type: str = Field(default="Custom", description="Alert type (Flood, Earthquake, etc.)")


class BulkSMSRequest(BaseModel):
    phone_numbers: List[str] = Field(..., min_length=1, description="List of 10-digit Nepali phone numbers")
    message: str = Field(..., min_length=1, max_length=500, description="SMS message text")
    alert_type: str = Field(default="Custom", description="Alert type")


class SMSResponse(BaseModel):
    success: bool
    phone: str
    message_id: Optional[str] = None
    error: Optional[str] = None


class BulkSMSResponse(BaseModel):
    total: int
    sent: int
    failed: int
    results: List[SMSResponse]


# ─── Helper ───────────────────────────────────────────────────

async def _send_single_sms(phone: str, message: str) -> SMSResponse:
    """Send a single SMS via Aakash SMS API"""
    auth_token = settings.AAKASH_SMS_AUTH_TOKEN
    if not auth_token or auth_token == "your_aakash_sms_auth_token_here":
        return SMSResponse(
            success=False,
            phone=phone,
            error="Aakash SMS auth token not configured. Please set AAKASH_SMS_AUTH_TOKEN in .env"
        )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                AAKASH_SMS_API_URL,
                params={
                    "auth_token": auth_token,
                    "to": phone,
                    "text": message,
                }
            )
            data = response.json()

            if not data.get("error") and data.get("data", {}).get("valid"):
                msg_id = data["data"]["valid"][0].get("id", "")
                return SMSResponse(
                    success=True,
                    phone=phone,
                    message_id=str(msg_id)
                )
            else:
                err_msg = data.get("message", "Unknown error from Aakash SMS")
                return SMSResponse(success=False, phone=phone, error=err_msg)

    except httpx.TimeoutException:
        return SMSResponse(success=False, phone=phone, error="Request timed out")
    except Exception as e:
        return SMSResponse(success=False, phone=phone, error=str(e))


# ─── Endpoints ────────────────────────────────────────────────

@router.post("/send", response_model=SMSResponse)
async def send_sms(
    request: SendSMSRequest,
    current_user: User = Depends(get_current_admin)
):
    """
    Send a single disaster alert SMS to a phone number.
    Admin only.
    """
    result = await _send_single_sms(request.phone, request.message)
    return result


@router.post("/send-bulk", response_model=BulkSMSResponse)
async def send_bulk_sms(
    request: BulkSMSRequest,
    current_user: User = Depends(get_current_admin)
):
    """
    Send disaster alert SMS to multiple phone numbers.
    Admin only.
    """
    results = []
    for phone in request.phone_numbers:
        result = await _send_single_sms(phone, request.message)
        results.append(result)

    sent_count = sum(1 for r in results if r.success)
    failed_count = sum(1 for r in results if not r.success)

    return BulkSMSResponse(
        total=len(request.phone_numbers),
        sent=sent_count,
        failed=failed_count,
        results=results
    )


@router.post("/broadcast", response_model=BulkSMSResponse)
async def broadcast_to_citizens(
    message: str = Query(..., min_length=1),
    alert_type: str = Query("Custom"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Broadcast disaster alert SMS to ALL registered citizens who have phone numbers.
    Admin only.
    """
    citizens = db.query(User).filter(
        User.role == "citizen",
        User.is_active == True,
        User.phone.isnot(None),
        User.phone != ""
    ).all()

    if not citizens:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No citizens with registered phone numbers found"
        )

    results = []
    for citizen in citizens:
        phone = citizen.phone.strip()  # type: ignore
        # Normalize: remove +977 prefix if present
        if phone.startswith("+977"):
            phone = phone[4:]
        elif phone.startswith("977"):
            phone = phone[3:]

        if len(phone) == 10 and phone.isdigit():
            result = await _send_single_sms(phone, message)
            results.append(result)
        else:
            results.append(SMSResponse(
                success=False,
                phone=phone,
                error="Invalid phone number format"
            ))

    sent_count = sum(1 for r in results if r.success)
    failed_count = sum(1 for r in results if not r.success)

    return BulkSMSResponse(
        total=len(results),
        sent=sent_count,
        failed=failed_count,
        results=results
    )


@router.get("/citizens-with-phone")
async def get_citizens_with_phone(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Get all active citizens who have registered phone numbers.
    Admin only. Used for recipient selection in the SMS alert UI.
    """
    citizens = db.query(User).filter(
        User.role == "citizen",
        User.is_active == True,
        User.phone.isnot(None),
        User.phone != ""
    ).all()

    return {
        "total": len(citizens),
        "citizens": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "profile_picture": c.profile_picture,
            }
            for c in citizens
        ]
    }
