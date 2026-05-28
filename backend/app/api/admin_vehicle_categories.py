from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import Admin, VehicleCategory, Vehicle
from app.api.admin_auth import get_current_admin

router = APIRouter()

class VehicleCategoryCreate(BaseModel):
    name: str
    group: str
    icon: Optional[str] = None

class VehicleCategoryResponse(BaseModel):
    id: str
    name: str
    group: str
    icon: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[VehicleCategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    categories = db.query(VehicleCategory).filter(
        VehicleCategory.organization_id == current_admin.organization_id
    ).all()
    return categories

@router.post("/", response_model=VehicleCategoryResponse)
def create_category(
    data: VehicleCategoryCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    if data.group not in ["car", "equipment"]:
        raise HTTPException(status_code=400, detail="Invalid group. Must be 'car' or 'equipment'.")

    # Check if a category with the same name exists
    existing = db.query(VehicleCategory).filter(
        VehicleCategory.organization_id == current_admin.organization_id,
        VehicleCategory.name == data.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="O categorie cu acest nume există deja.")

    new_category = VehicleCategory(
        organization_id=current_admin.organization_id,
        name=data.name,
        group=data.group,
        icon=data.icon
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@router.put("/{category_id}", response_model=VehicleCategoryResponse)
def update_category(
    category_id: str,
    data: VehicleCategoryCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    category = db.query(VehicleCategory).filter(
        VehicleCategory.id == category_id,
        VehicleCategory.organization_id == current_admin.organization_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if data.group not in ["car", "equipment"]:
        raise HTTPException(status_code=400, detail="Invalid group. Must be 'car' or 'equipment'.")

    # Check duplicate name
    existing = db.query(VehicleCategory).filter(
        VehicleCategory.organization_id == current_admin.organization_id,
        VehicleCategory.name == data.name,
        VehicleCategory.id != category_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="O categorie cu acest nume există deja.")

    category.name = data.name
    category.group = data.group
    category.icon = data.icon

    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}")
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    category = db.query(VehicleCategory).filter(
        VehicleCategory.id == category_id,
        VehicleCategory.organization_id == current_admin.organization_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Ensure no vehicles are using this category
    # vehicle.type currently stores the string name, but we might check by name
    vehicles_using = db.query(Vehicle).filter(
        Vehicle.organization_id == current_admin.organization_id,
        Vehicle.type == category.name
    ).first()
    
    if vehicles_using:
        raise HTTPException(status_code=400, detail="Nu poți șterge această categorie deoarece există mașini/utilaje care o folosesc.")

    db.delete(category)
    db.commit()
    return {"message": "Categorie ștearsă cu succes"}
