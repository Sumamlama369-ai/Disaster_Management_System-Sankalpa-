"""
Drone Permit API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, cast
from datetime import datetime
from app.database.database import get_db
from app.models.drone_permit import DronePermit, PermitStatus, RegistrationType
from app.models.user import User
from app.schemas.drone_permit import OfficerReview, PermitResponse
from app.api.v1.dependencies.auth import get_current_user
import os
import shutil

from fastapi.responses import FileResponse
import zipfile
import tempfile


router = APIRouter()


# File upload directory
UPLOAD_DIR = "uploads/permits"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/submit", status_code=201)
async def submit_permit_request(
    # Drone specs
    manufacturer: str = Form(...),
    model: str = Form(...),
    serial_number: str = Form(...),
    manufactured_year: int = Form(...),
    drone_type: str = Form(...),
    max_payload: float = Form(...),
    color: str = Form(...),
    retailer_name: str = Form(...),
    
    # Operator
    registration_type: str = Form(...),
    full_name: str = Form(...),
    citizenship_passport_no: str = Form(...),
    date_of_birth: str = Form(...),
    phone_number: str = Form(...),
    email_address: str = Form(...),
    username: str = Form(...),
    
    # Address
    country: str = Form(...),
    province: str = Form(...),
    district: str = Form(...),
    municipality: str = Form(...),
    ward_no: str = Form(...),
    
    # Agreement
    agrees_to_rules: bool = Form(...),
    
    # Files
    purpose_letter: UploadFile = File(...),
    purchase_bill: UploadFile = File(...),
    drone_image: UploadFile = File(...),
    citizenship_doc: UploadFile = File(...),
    
    # Dependencies
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit drone permit request"""
    
    # Create user folder
    user_folder = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_folder, exist_ok=True)
    
    # Generate unique filenames
    timestamp = datetime.now().timestamp()
    purpose_letter_path = os.path.join(user_folder, f"purpose_{timestamp}_{purpose_letter.filename}")
    purchase_bill_path = os.path.join(user_folder, f"bill_{timestamp}_{purchase_bill.filename}")
    drone_image_path = os.path.join(user_folder, f"drone_{timestamp}_{drone_image.filename}")
    citizenship_path = os.path.join(user_folder, f"citizenship_{timestamp}_{citizenship_doc.filename}")
    
    # Save files
    with open(purpose_letter_path, "wb") as f:
        shutil.copyfileobj(purpose_letter.file, f)
    
    with open(purchase_bill_path, "wb") as f:
        shutil.copyfileobj(purchase_bill.file, f)
    
    with open(drone_image_path, "wb") as f:
        shutil.copyfileobj(drone_image.file, f)
    
    with open(citizenship_path, "wb") as f:
        shutil.copyfileobj(citizenship_doc.file, f)
    
    # Parse registration type
    reg_type = RegistrationType.INDIVIDUAL if registration_type.lower() == "individual" else RegistrationType.COMPANY
    
    # Create permit request
    permit = DronePermit(
        user_id=current_user.id,
        user_email=current_user.email,
        manufacturer=manufacturer,
        model=model,
        serial_number=serial_number,
        manufactured_year=manufactured_year,
        drone_type=drone_type,
        max_payload=max_payload,
        color=color,
        retailer_name=retailer_name,
        purpose_letter=purpose_letter_path,
        purchase_bill=purchase_bill_path,
        drone_image=drone_image_path,
        citizenship_doc=citizenship_path,
        registration_type=reg_type,
        full_name=full_name,
        citizenship_passport_no=citizenship_passport_no,
        date_of_birth=datetime.strptime(date_of_birth, "%Y-%m-%d"),
        phone_number=phone_number,
        email_address=email_address,
        username=username,
        country=country,
        province=province,
        district=district,
        municipality=municipality,
        ward_no=ward_no,
        agrees_to_rules=agrees_to_rules,
        status=PermitStatus.PENDING
    )
    
    db.add(permit)
    db.commit()
    db.refresh(permit)
    
    return {
        "success": True,
        "message": "Permit request submitted successfully",
        "permit_id": permit.id
    }


@router.get("/my-permits", response_model=List[PermitResponse])
def get_my_permits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all permits for current user"""
    permits = db.query(DronePermit).filter(
        DronePermit.user_id == current_user.id
    ).order_by(DronePermit.created_at.desc()).all()
    
    return permits


@router.get("/pending", response_model=List[PermitResponse])
def get_pending_permits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending permits (Officer only)"""
    if current_user.role.value not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Officer access required")
    
    permits = db.query(DronePermit).filter(
        DronePermit.status == PermitStatus.PENDING
    ).order_by(DronePermit.created_at.desc()).all()
    
    return permits


@router.get("/{permit_id}")
def get_permit_details(
    permit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get full permit details"""
    permit = db.query(DronePermit).filter(DronePermit.id == permit_id).first()
    
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    
    # Citizens can only view their own permits
    # Type assertion to help Pylance understand this is an integer comparison
    user_id: int = cast(int, permit.user_id)
    if current_user.role.value == "citizen" and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return permit


@router.post("/review")
def review_permit(
    review: OfficerReview,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject permit (Officer only)"""
    if current_user.role.value not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Officer access required")
    
    permit = db.query(DronePermit).filter(DronePermit.id == review.permit_id).first()
    
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    
    # Type assertion for status comparison
    current_status: PermitStatus = cast(PermitStatus, permit.status)
    if current_status != PermitStatus.PENDING:
        raise HTTPException(status_code=400, detail="Permit already reviewed")
    
    # Update permit status with proper type handling
    new_status = PermitStatus.APPROVED if review.status == "approved" else PermitStatus.REJECTED
    
    # Use setattr to avoid type checking issues with direct assignment
    setattr(permit, 'status', new_status)
    setattr(permit, 'reviewed_by_officer_id', current_user.id)
    setattr(permit, 'officer_name', review.officer_name)
    setattr(permit, 'officer_designation', review.officer_designation)
    setattr(permit, 'officer_organization', review.officer_organization)
    setattr(permit, 'officer_email', review.officer_email)
    setattr(permit, 'review_remarks', review.review_remarks)
    setattr(permit, 'reviewed_at', datetime.utcnow())
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Permit {review.status}",
        "permit_id": permit.id
    }

from fastapi.responses import FileResponse
import zipfile
import tempfile

# ... existing code ...

@router.get("/download/{permit_id}")
def download_permit_package(
    permit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download complete permit package (data + documents) as ZIP"""
    if current_user.role.value not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Officer access required")
    
    permit = db.query(DronePermit).filter(DronePermit.id == permit_id).first()
    
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    
    # Create temporary ZIP file
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
    
    try:
        with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add permit data as text file
            permit_data = f"""DRONE PERMIT APPLICATION #{permit.id}
{'='*60}

APPLICANT INFORMATION:
- Full Name: {permit.full_name}
- Email: {permit.email_address}
- Phone: {permit.phone_number}
- Username: {permit.username}
- Registration Type: {permit.registration_type}
- Citizenship/Passport: {permit.citizenship_passport_no}
- Date of Birth: {permit.date_of_birth.strftime('%Y-%m-%d')}

ADDRESS:
- Country: {permit.country}
- Province: {permit.province}
- District: {permit.district}
- Municipality: {permit.municipality}
- Ward No: {permit.ward_no}

DRONE SPECIFICATIONS:
- Manufacturer: {permit.manufacturer}
- Model: {permit.model}
- Serial Number: {permit.serial_number}
- Manufactured Year: {permit.manufactured_year}
- Type: {permit.drone_type}
- Max Payload: {permit.max_payload} kg
- Color: {permit.color}
- Retailer: {permit.retailer_name}

APPLICATION STATUS:
- Status: {permit.status.value.upper()}
- Applied Date: {permit.created_at.strftime('%Y-%m-%d %H:%M:%S')}
- Agrees to Rules: {'Yes' if permit.agrees_to_rules is True else 'No'}

{'='*60}
Generated by Sankalpa Disaster Management System
"""
            
            zipf.writestr(f"permit_{permit.id}_data.txt", permit_data)
            
            # Add documents
            drone_image_path = str(permit.drone_image) if permit.drone_image is not None else ""
            documents = [
                (permit.purpose_letter, 'purpose_letter.pdf'),
                (permit.purchase_bill, 'purchase_bill.pdf'),
                (permit.drone_image, f'drone_image{os.path.splitext(drone_image_path)[1]}'),
                (permit.citizenship_doc, 'citizenship_document.pdf')
            ]
            
            for doc_path, filename in documents:
                doc_path_str = str(doc_path) if doc_path is not None else ""
                if doc_path_str and os.path.exists(doc_path_str):
                    zipf.write(doc_path_str, filename)
        
        # Return ZIP file
        return FileResponse(
            temp_zip.name,
            media_type='application/zip',
            filename=f'permit_{permit.id}_{permit.full_name.replace(" ", "_")}.zip'
        )
    
    except Exception as e:
        if os.path.exists(temp_zip.name):
            os.unlink(temp_zip.name)
        raise HTTPException(status_code=500, detail=f"Failed to create download package: {str(e)}")