from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date

from app.database import get_db
from app.models import Expense, Admin, Organization, ConstructionSite, User
from app.api.admin_auth import get_current_admin

router = APIRouter(prefix="/admin/expenses", tags=["Admin - Cheltuieli"])

class ExpenseCreateBody(BaseModel):
    site_id: str
    user_id: Optional[str] = None
    category: str
    amount: float
    currency: str = "RON"
    date: date
    description: Optional[str] = None
    document_url: Optional[str] = None

class ExpenseUpdateBody(BaseModel):
    site_id: Optional[str] = None
    user_id: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    date: Optional[date] = None
    description: Optional[str] = None
    document_url: Optional[str] = None

def expense_to_dict(e: Expense, site_name: str = None, user_name: str = None) -> dict:
    return {
        "id": e.id,
        "site_id": e.site_id,
        "site_name": site_name,
        "user_id": e.user_id,
        "user_name": user_name,
        "category": e.category,
        "amount": e.amount,
        "currency": e.currency,
        "date": str(e.date),
        "description": e.description,
        "document_url": e.document_url,
        "created_at": str(e.created_at),
    }

@router.get("/")
def get_expenses(
    site_id: Optional[str] = None,
    category: Optional[str] = None,
    month: Optional[str] = None, # format YYYY-MM
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    q = db.query(Expense, ConstructionSite.name, User.full_name).outerjoin(
        ConstructionSite, Expense.site_id == ConstructionSite.id
    ).outerjoin(
        User, Expense.user_id == User.id
    ).filter(
        Expense.organization_id == current_admin.organization_id
    )

    if site_id:
        q = q.filter(Expense.site_id == site_id)
    if category:
        q = q.filter(Expense.category == category)
    if month:
        # Simple string matching for YYYY-MM
        q = q.filter(Expense.date.cast(str).like(f"{month}%"))
        
    results = q.order_by(Expense.date.desc(), Expense.created_at.desc()).all()
    
    return [expense_to_dict(e, s_name, u_name) for e, s_name, u_name in results]

@router.post("/")
def create_expense(
    body: ExpenseCreateBody,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    # Validate site
    site = db.query(ConstructionSite).filter(
        ConstructionSite.id == body.site_id,
        ConstructionSite.organization_id == current_admin.organization_id
    ).first()
    if not site:
        raise HTTPException(404, "Șantierul nu a fost găsit")

    # Validate user if provided
    if body.user_id:
        u = db.query(User).filter(
            User.id == body.user_id,
            User.organization_id == current_admin.organization_id
        ).first()
        if not u:
            raise HTTPException(404, "Angajatul nu a fost găsit")

    e = Expense(
        organization_id=current_admin.organization_id,
        site_id=body.site_id,
        user_id=body.user_id,
        category=body.category,
        amount=body.amount,
        currency=body.currency,
        date=body.date,
        description=body.description,
        document_url=body.document_url
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return expense_to_dict(e, site.name)

@router.put("/{expense_id}")
def update_expense(
    expense_id: str,
    body: ExpenseUpdateBody,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    e = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.organization_id == current_admin.organization_id
    ).first()
    if not e:
        raise HTTPException(404, "Cheltuiala nu a fost găsită")

    if body.site_id is not None: e.site_id = body.site_id
    if body.user_id is not None: e.user_id = body.user_id
    if body.category is not None: e.category = body.category
    if body.amount is not None: e.amount = body.amount
    if body.currency is not None: e.currency = body.currency
    if body.date is not None: e.date = body.date
    if body.description is not None: e.description = body.description
    if body.document_url is not None: e.document_url = body.document_url

    db.commit()
    return {"message": "Actualizat cu succes"}

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    e = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.organization_id == current_admin.organization_id
    ).first()
    if not e:
        raise HTTPException(404, "Cheltuiala nu a fost găsită")
    
    db.delete(e)
    db.commit()
    return {"message": "Cheltuială ștearsă"}
