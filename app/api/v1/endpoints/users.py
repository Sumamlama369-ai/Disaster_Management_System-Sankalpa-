"""
User API Endpoints
Routes for user profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func, case, extract
from typing import Optional
import asyncio
from pydantic import BaseModel, Field
from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.disaster_reports import DisasterReport
from app.models.drone_permit import DronePermit
from app.schemas.auth import UserResponse, UpdatePhoneRequest, UpdateDistrictRequest
from app.services.ws_manager import ws_manager
from app.api.v1.dependencies.auth import (
    get_current_user,
    get_current_officer,
    get_current_admin
)


router = APIRouter()


# ─── Admin CRUD Schemas ──────────────────────────────────────
class AdminUpdateUserRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    district: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = Field(None)
    is_active: Optional[bool] = None


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Get current user's profile

    Requires: Valid JWT token
    """
    return UserResponse(
        id=current_user.id,  # type: ignore
        email=current_user.email,  # type: ignore
        name=current_user.name,  # type: ignore
        role=current_user.role.value,
        profile_picture=current_user.profile_picture,  # type: ignore
        phone=current_user.phone,  # type: ignore
        district=current_user.district,  # type: ignore
    )


@router.put("/me/phone", response_model=UserResponse)
def update_phone_number(
    request: UpdatePhoneRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user's phone number

    Requires: Valid JWT token
    """
    current_user.phone = request.phone  # type: ignore
    db.commit()
    db.refresh(current_user)

    # Notify WebSocket subscribers that citizen phone data changed
    asyncio.create_task(ws_manager.notify("citizens", "phone_updated"))

    return UserResponse(
        id=current_user.id,  # type: ignore
        email=current_user.email,  # type: ignore
        name=current_user.name,  # type: ignore
        role=current_user.role.value,
        profile_picture=current_user.profile_picture,  # type: ignore
        phone=current_user.phone,  # type: ignore
        district=current_user.district,  # type: ignore
    )


@router.put("/me/district", response_model=UserResponse)
def update_district(
    request: UpdateDistrictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user's district

    Requires: Valid JWT token
    """
    current_user.district = request.district  # type: ignore
    db.commit()
    db.refresh(current_user)

    return UserResponse(
        id=current_user.id,  # type: ignore
        email=current_user.email,  # type: ignore
        name=current_user.name,  # type: ignore
        role=current_user.role.value,
        profile_picture=current_user.profile_picture,  # type: ignore
        phone=current_user.phone,  # type: ignore
        district=current_user.district,  # type: ignore
    )


@router.get("/profile/{user_id}", response_model=UserResponse)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get any user's profile

    Citizens: Can only view their own profile
    Officers: Can view any profile
    Admins: Can view any profile
    """
    # Citizens can only view their own profile
    if current_user.role.value == "citizen" and current_user.id != user_id:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(
        id=user.id,  # type: ignore
        email=user.email,  # type: ignore
        name=user.name,  # type: ignore
        role=user.role.value,
        profile_picture=user.profile_picture,  # type: ignore
        phone=user.phone,  # type: ignore
        district=user.district,  # type: ignore
    )


@router.get("/all")
def get_all_users(
    skip: int = 0,
    limit: int = 500,
    role: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Get all users (Admin only) with filtering, search, and activity counts
    """
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for user in users:
        report_count = db.query(sql_func.count(DisasterReport.id)).filter(DisasterReport.user_id == user.id).scalar() or 0
        permit_count = db.query(sql_func.count(DronePermit.id)).filter(DronePermit.user_id == user.id).scalar() or 0
        assigned_count = 0
        if user.role.value == 'officer':
            assigned_count = db.query(sql_func.count(DisasterReport.id)).filter(DisasterReport.assigned_officer_id == user.id).scalar() or 0

        result.append({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "is_verified": user.is_verified,
            "is_active": user.is_active,
            "profile_picture": user.profile_picture,
            "phone": user.phone,
            "district": user.district,
            "organization_code": user.organization_code,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "report_count": report_count,
            "permit_count": permit_count,
            "assigned_count": assigned_count,
        })

    return {"total": total, "users": result}


@router.delete("/delete/{user_id}")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Only admins
):
    """
    Deactivate user account (Admin only)

    Soft delete - user is marked as inactive
    """
    if current_user.id == user_id:  # type: ignore
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    setattr(user, 'is_active', False)
    db.commit()

    return {"success": True, "message": f"User {user.email} deactivated"}


@router.put("/admin/update/{user_id}")
def admin_update_user(
    user_id: int,
    request: AdminUpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Admin: update any user's profile fields (name, phone, district, role, is_active)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if request.name is not None:
        user.name = request.name
    if request.phone is not None:
        user.phone = request.phone
    if request.district is not None:
        user.district = request.district
    if request.role is not None:
        if request.role not in [r.value for r in UserRole]:
            raise HTTPException(status_code=400, detail="Invalid role")
        if current_user.id == user_id and request.role != user.role.value:
            raise HTTPException(status_code=400, detail="Cannot change your own role")
        user.role = request.role
    if request.is_active is not None:
        if current_user.id == user_id and not request.is_active:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        user.is_active = request.is_active

    db.commit()
    db.refresh(user)

    # Notify WebSocket subscribers that user data has changed
    asyncio.create_task(ws_manager.notify("users", "user_updated"))
    asyncio.create_task(ws_manager.notify("citizens", "user_updated"))

    return {
        "success": True,
        "message": f"User {user.email} updated",
        "user": {
            "id": user.id, "email": user.email, "name": user.name,
            "role": user.role.value, "is_verified": user.is_verified,
            "is_active": user.is_active, "phone": user.phone,
            "district": user.district, "profile_picture": user.profile_picture,
            "organization_code": user.organization_code,
            "created_at": user.created_at, "updated_at": user.updated_at,
        }
    }


@router.put("/admin/activate/{user_id}")
def admin_activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Admin: reactivate a deactivated user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    return {"success": True, "message": f"User {user.email} reactivated"}


@router.get("/admin/stats")
def admin_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Admin: aggregated user & activity statistics for dashboard visualizations"""
    total = db.query(sql_func.count(User.id)).scalar() or 0
    active = db.query(sql_func.count(User.id)).filter(User.is_active == True).scalar() or 0
    verified = db.query(sql_func.count(User.id)).filter(User.is_verified == True).scalar() or 0

    role_counts = dict(
        db.query(User.role, sql_func.count(User.id))
        .group_by(User.role).all()
    )

    # District distribution
    district_dist = dict(
        db.query(User.district, sql_func.count(User.id))
        .filter(User.district.isnot(None), User.district != "")
        .group_by(User.district).all()
    )

    # Monthly registration trend (last 12 months)
    monthly_regs = db.query(
        extract('year', User.created_at).label('y'),
        extract('month', User.created_at).label('m'),
        User.role,
        sql_func.count(User.id)
    ).group_by('y', 'm', User.role).order_by('y', 'm').all()

    monthly_trend = {}
    for y, m, role, count in monthly_regs:
        key = f"{int(y)}-{int(m):02d}"
        if key not in monthly_trend:
            monthly_trend[key] = {"citizen": 0, "officer": 0, "admin": 0}
        monthly_trend[key][role.value if hasattr(role, 'value') else role] = count

    # Reports per role
    citizen_reports = db.query(sql_func.count(DisasterReport.id)).join(
        User, DisasterReport.user_id == User.id
    ).filter(User.role == UserRole.CITIZEN).scalar() or 0

    officer_assigned = db.query(sql_func.count(DisasterReport.id)).filter(
        DisasterReport.assigned_officer_id.isnot(None)
    ).scalar() or 0

    # Reports by status
    status_dist = dict(
        db.query(DisasterReport.status, sql_func.count(DisasterReport.id))
        .group_by(DisasterReport.status).all()
    )

    # Permits by status
    permit_status = dict(
        db.query(DronePermit.status, sql_func.count(DronePermit.id))
        .group_by(DronePermit.status).all()
    )

    # Top active citizens (most reports)
    top_citizens = db.query(
        User.id, User.name, User.email, User.district, User.profile_picture,
        sql_func.count(DisasterReport.id).label('count')
    ).join(DisasterReport, DisasterReport.user_id == User.id
    ).filter(User.role == UserRole.CITIZEN
    ).group_by(User.id, User.name, User.email, User.district, User.profile_picture
    ).order_by(sql_func.count(DisasterReport.id).desc()).limit(10).all()

    # Top active officers (most assigned)
    top_officers = db.query(
        User.id, User.name, User.email, User.district, User.profile_picture,
        sql_func.count(DisasterReport.id).label('count')
    ).join(DisasterReport, DisasterReport.assigned_officer_id == User.id
    ).filter(User.role == UserRole.OFFICER
    ).group_by(User.id, User.name, User.email, User.district, User.profile_picture
    ).order_by(sql_func.count(DisasterReport.id).desc()).limit(10).all()

    return {
        "total_users": total,
        "active_users": active,
        "verified_users": verified,
        "inactive_users": total - active,
        "role_counts": {(k.value if hasattr(k, 'value') else k): v for k, v in role_counts.items()},
        "district_distribution": district_dist,
        "monthly_trend": monthly_trend,
        "citizen_reports_total": citizen_reports,
        "officer_assigned_total": officer_assigned,
        "report_status_distribution": {str(k): v for k, v in status_dist.items()},
        "permit_status_distribution": {str(k): v for k, v in permit_status.items()},
        "top_citizens": [{"id": c[0], "name": c[1], "email": c[2], "district": c[3], "profile_picture": c[4], "report_count": c[5]} for c in top_citizens],
        "top_officers": [{"id": o[0], "name": o[1], "email": o[2], "district": o[3], "profile_picture": o[4], "assigned_count": o[5]} for o in top_officers],
    }
