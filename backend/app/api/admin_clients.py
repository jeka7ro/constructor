import requests
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr, model_validator, field_validator
from datetime import datetime

from app.database import get_db
from app.models import Client, Admin
from app.api.admin_auth import get_current_admin

router = APIRouter()

# --- Schemas ---
class ClientBase(BaseModel):
    client_type: str = Field("juridica", max_length=20)
    country: str = Field("RO", max_length=2)
    name: str = Field(..., min_length=2, max_length=255)
    cui: Optional[str] = Field(None, max_length=50)
    reg_com: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    preferred_language: str = Field("ro", max_length=10)
    bank_name: Optional[str] = Field(None, max_length=100)
    iban: Optional[str] = Field(None, max_length=50)
    swift: Optional[str] = Field(None, max_length=20)
    is_active: bool = True
    is_favorite: Optional[bool] = False

    @field_validator('email', mode='before')
    @classmethod
    def clean_email(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    @model_validator(mode='before')
    @classmethod
    def clean_empty_strings(cls, values):
        if isinstance(values, dict):
            for k, v in list(values.items()):
                if isinstance(v, str):
                    stripped = v.strip()
                    if stripped == "":
                        values[k] = None
                    else:
                        values[k] = stripped
        return values

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    client_type: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=2)
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    cui: Optional[str] = Field(None, max_length=50)
    reg_com: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_person: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    preferred_language: Optional[str] = Field(None, max_length=10)
    bank_name: Optional[str] = Field(None, max_length=100)
    iban: Optional[str] = Field(None, max_length=50)
    swift: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    is_favorite: Optional[bool] = None

    @model_validator(mode='before')
    @classmethod
    def clean_empty_strings(cls, values):
        if isinstance(values, dict):
            for k, v in list(values.items()):
                if isinstance(v, str):
                    stripped = v.strip()
                    if stripped == "":
                        values[k] = None
                    else:
                        values[k] = stripped
        return values

class ClientResponse(ClientBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Endpoints ---
@router.get("", response_model=List[ClientResponse])
def get_clients(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """List all clients for the organization"""
    if current_admin.organization_id:
        clients = db.query(Client).filter(Client.organization_id == current_admin.organization_id).all()
    else:
        clients = db.query(Client).all()
    return clients

@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_in: ClientCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Create a new client"""
    if not current_admin.organization_id:
        raise HTTPException(status_code=400, detail="Admin has no organization assigned")
        
    client = Client(
        **client_in.dict(),
        organization_id=current_admin.organization_id
    )
    
    db.add(client)
    db.commit()
    db.refresh(client)
    
    return client

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: str,
    client_in: ClientUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Update an existing client"""
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.organization_id == current_admin.organization_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    update_data = client_in.dict(exclude_unset=True)
    name_changed = False
    old_name = None
    
    if "name" in update_data and update_data["name"] != client.name:
        name_changed = True
        
    for field, value in update_data.items():
        setattr(client, field, value)
        
    client.updated_at = datetime.utcnow()
    
    if name_changed:
        from app.models import WorkOrder
        db.query(WorkOrder).filter(WorkOrder.client_id == client_id).update({
            "client_name": client.name
        })
        
    db.commit()
    db.refresh(client)
    
    return client

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    """Delete a client"""
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.organization_id == current_admin.organization_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    # Check if client is used by any construction sites
    from app.models import ConstructionSite, WorkOrder
    sites_using_client = db.query(ConstructionSite).filter(ConstructionSite.client_id == client_id).first()
    wos_using_client = db.query(WorkOrder).filter(WorkOrder.client_id == client_id).first()
    
    if sites_using_client or wos_using_client:
        raise HTTPException(
            status_code=400, 
            detail="Impossible de supprimer le client: il est utilisé dans des devis, chantiers ou commandes existantes."
        )
        
    db.delete(client)
    db.commit()
    
    return None

@router.get("/vies/{country_code}/{vat_number}")
def check_vies(country_code: str, vat_number: str, current_admin: Admin = Depends(get_current_admin)):
    url = f"https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{country_code}/vat/{vat_number}"
    try:
        resp = requests.get(url, timeout=10.0)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("isValid"):
                return {
                    "valid": True,
                    "name": data.get("name", ""),
                    "address": data.get("address", "")
                }
            else:
                raise HTTPException(status_code=404, detail="VAT Number is not valid or not found")
        else:
            raise HTTPException(status_code=resp.status_code, detail="VIES API Service Unavailable")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to VIES: {str(e)}")

@router.get("/kbo/{vat_number}")
def check_kbo(vat_number: str, current_admin: Admin = Depends(get_current_admin)):
    from app.services.kbo_scraper import fetch_kbo_data
    result = fetch_kbo_data(vat_number)
    
    if result and result.get("valid"):
        return result
    else:
        error_msg = result.get("error", "Company not found in KBO") if result else "Company not found in KBO"
        raise HTTPException(status_code=404, detail=error_msg)

@router.get("/search")
def search_clients(q: str = Query(..., min_length=2), db: Session = Depends(get_db), current_admin: Admin = Depends(get_current_admin)):
    search_term = f"%{q}%"
    clients = db.query(Client).filter(
        (Client.organization_id == current_admin.organization_id) &
        (
            Client.name.ilike(search_term) | 
            Client.cui.ilike(search_term)
        )
    ).limit(10).all()
    
    return [
        {
            "id": c.id,
            "name": c.name,
            "cui": c.cui,
            "address": c.address,
            "country": c.country,
            "client_type": c.client_type,
            "phone": c.phone,
            "email": c.email,
            "contact_person": c.contact_person
        }
        for c in clients
    ]
