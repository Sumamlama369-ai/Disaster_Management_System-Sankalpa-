from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.api.v1.endpoints import auth, drone_permit, disaster, video
from app.database.database import engine, Base

# Import models for table creation
from app.models import user, otp, drone_permit as drone_permit_models, disaster as disaster_models, video as video_models

# Try to import org_code if it exists, otherwise skip
try:
    from app.models import organization_code  # or org_code, whichever exists
    has_org_code = True
except ImportError:
    has_org_code = False
    print("⚠️ organization_code model not found, skipping...")

# Background tasks
from app.services.background_tasks import background_tasks

# Create upload directories
os.makedirs("uploads/original", exist_ok=True)
os.makedirs("uploads/processed", exist_ok=True)
os.makedirs("uploads/detection_output", exist_ok=True)
os.makedirs("uploads/segmentation_output", exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Starting server at http://0.0.0.0:8000")
    print("📚 API Docs: http://0.0.0.0:8000/docs")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created successfully!")
    print("✓ Database initialized")
    
    # Start background tasks
    background_tasks.start()
    
    yield
    
    # Shutdown
    background_tasks.stop()

# Create FastAPI app
app = FastAPI(
    title="Disaster Management System",
    description="API for disaster management with drone permits and live monitoring",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (for serving videos)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(drone_permit.router, prefix="/api/v1/permits", tags=["Drone Permits"])
app.include_router(disaster.router, prefix="/api/v1/disasters", tags=["Disasters"])
app.include_router(video.router, prefix="/api/v1/video", tags=["Video Analysis"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Disaster Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected",
        "background_tasks": "running" if background_tasks.running else "stopped"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )