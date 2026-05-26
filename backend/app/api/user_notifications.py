from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import MaterialRequest, User
from app.api.auth import get_current_user

router = APIRouter(prefix="/user/notifications", tags=["User - Notificari"])

@router.get("/badges")
def get_notification_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Pending Signatures (Material Requests)
    pending_signatures = db.query(MaterialRequest).filter(
        MaterialRequest.user_id == current_user.id,
        MaterialRequest.status == "delivered"
    ).count()

    return {
        "material_requests": pending_signatures,
        "issues": 0,
        "inventory": 0
    }
