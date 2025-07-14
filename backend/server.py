from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
import pandas as pd
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Models
class UserLogin(BaseModel):
    email: str
    password: str

class Service(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    service_type: str  # Domain, Hosting, Domain+Hosting, Website, Consulting
    provider: str
    creation_date: date
    last_renewal_date: Optional[date] = None
    next_renewal_date: Optional[date] = None
    annual_fee: float
    currency: str = "TRY"
    status: str = "active"  # active, inactive
    notes: Optional[str] = None
    is_deleted: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceCreate(BaseModel):
    name: str
    service_type: str
    provider: str
    creation_date: date
    last_renewal_date: Optional[date] = None
    next_renewal_date: Optional[date] = None
    annual_fee: float
    currency: str = "TRY"
    status: str = "active"
    notes: Optional[str] = None

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    service_type: Optional[str] = None
    provider: Optional[str] = None
    creation_date: Optional[date] = None
    last_renewal_date: Optional[date] = None
    next_renewal_date: Optional[date] = None
    annual_fee: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

# Authentication
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Simple token check - in production, use proper JWT
    if credentials.credentials != "authenticated":
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return True

# Auth Routes
@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    # Hard-coded credentials as requested
    if user_data.email == "bilgi@gallaxdesign.com" and user_data.password == "gallax11":
        return {"token": "authenticated", "message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

# Service Routes
@api_router.get("/services", response_model=List[Service])
async def get_services(authenticated: bool = Depends(verify_token)):
    services = await db.services.find({"is_deleted": False}).to_list(1000)
    return [Service(**service) for service in services]

@api_router.post("/services", response_model=Service)
async def create_service(service_data: ServiceCreate, authenticated: bool = Depends(verify_token)):
    service_dict = service_data.dict()
    service_obj = Service(**service_dict)
    
    # Convert date objects to datetime for MongoDB
    service_data_for_db = service_obj.dict()
    for key, value in service_data_for_db.items():
        if isinstance(value, date) and not isinstance(value, datetime):
            service_data_for_db[key] = datetime.combine(value, datetime.min.time())
    
    await db.services.insert_one(service_data_for_db)
    return service_obj

@api_router.get("/services/{service_id}", response_model=Service)
async def get_service(service_id: str, authenticated: bool = Depends(verify_token)):
    service = await db.services.find_one({"id": service_id, "is_deleted": False})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return Service(**service)

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(service_id: str, service_data: ServiceUpdate, authenticated: bool = Depends(verify_token)):
    update_data = {k: v for k, v in service_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Convert date objects to datetime for MongoDB
    for key, value in update_data.items():
        if isinstance(value, date) and not isinstance(value, datetime):
            update_data[key] = datetime.combine(value, datetime.min.time())
    
    result = await db.services.update_one(
        {"id": service_id, "is_deleted": False},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    updated_service = await db.services.find_one({"id": service_id})
    return Service(**updated_service)

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, authenticated: bool = Depends(verify_token)):
    # Soft delete
    result = await db.services.update_one(
        {"id": service_id, "is_deleted": False},
        {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": "Service deleted successfully"}

@api_router.get("/services/stats/dashboard")
async def get_dashboard_stats(authenticated: bool = Depends(verify_token)):
    total_services = await db.services.count_documents({"is_deleted": False})
    active_services = await db.services.count_documents({"is_deleted": False, "status": "active"})
    
    # Calculate total annual fees
    pipeline = [
        {"$match": {"is_deleted": False, "status": "active"}},
        {"$group": {"_id": None, "total_fees": {"$sum": "$annual_fee"}}}
    ]
    total_fees_result = await db.services.aggregate(pipeline).to_list(1)
    total_annual_fees = total_fees_result[0]["total_fees"] if total_fees_result else 0
    
    # Services by type
    type_pipeline = [
        {"$match": {"is_deleted": False, "status": "active"}},
        {"$group": {"_id": "$service_type", "count": {"$sum": 1}}}
    ]
    services_by_type = await db.services.aggregate(type_pipeline).to_list(10)
    
    return {
        "total_services": total_services,
        "active_services": active_services,
        "total_annual_fees": total_annual_fees,
        "services_by_type": services_by_type
    }

@api_router.get("/services/export/excel")
async def export_services_excel(authenticated: bool = Depends(verify_token)):
    """Export services to Excel file"""
    try:
        services = await db.services.find({"is_deleted": False}).to_list(1000)
        
        # Prepare data for Excel
        excel_data = []
        for service in services:
            excel_data.append({
                "Hizmet Adı": service.get("name", ""),
                "Hizmet Türü": service.get("service_type", ""),
                "Sağlayıcı": service.get("provider", ""),
                "Yıllık Ücret": service.get("annual_fee", 0),
                "Para Birimi": service.get("currency", "TRY"),
                "Oluşturma Tarihi": service.get("creation_date", "").strftime("%d.%m.%Y") if service.get("creation_date") else "",
                "Son Yenileme": service.get("last_renewal_date", "").strftime("%d.%m.%Y") if service.get("last_renewal_date") else "",
                "Sonraki Yenileme": service.get("next_renewal_date", "").strftime("%d.%m.%Y") if service.get("next_renewal_date") else "",
                "Durum": "Aktif" if service.get("status") == "active" else "Pasif",
                "Notlar": service.get("notes", "")
            })
        
        # Create Excel file
        df = pd.DataFrame(excel_data)
        
        # Create Excel file in memory
        excel_buffer = io.BytesIO()
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Hizmetler', index=False)
        
        excel_buffer.seek(0)
        
        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(excel_buffer.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=hizmetler.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel export failed: {str(e)}")

@api_router.get("/services/export/pdf")
async def export_services_pdf(authenticated: bool = Depends(verify_token)):
    """Export services to PDF file"""
    try:
        services = await db.services.find({"is_deleted": False}).to_list(1000)
        
        # Create PDF file in memory
        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4)
        
        # Create styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            alignment=1,  # Center alignment
            fontSize=18,
            spaceAfter=30,
        )
        
        # Create elements
        elements = []
        
        # Title
        title = Paragraph("Hizmet Listesi", title_style)
        elements.append(title)
        elements.append(Spacer(1, 20))
        
        # Prepare table data
        table_data = [
            ["Hizmet", "Tür", "Sağlayıcı", "Yıllık Ücret", "Sonraki Yenileme", "Durum"]
        ]
        
        for service in services:
            table_data.append([
                service.get("name", ""),
                service.get("service_type", ""),
                service.get("provider", ""),
                f"₺{service.get('annual_fee', 0):,.0f}",
                service.get("next_renewal_date", "").strftime("%d.%m.%Y") if service.get("next_renewal_date") else "-",
                "Aktif" if service.get("status") == "active" else "Pasif"
            ])
        
        # Create table
        table = Table(table_data, colWidths=[1.5*inch, 1*inch, 1.2*inch, 1*inch, 1*inch, 0.8*inch])
        
        # Style the table
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))
        
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        pdf_buffer.seek(0)
        
        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(pdf_buffer.read()),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=hizmetler.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF export failed: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()