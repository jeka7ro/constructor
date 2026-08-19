import asyncio
from app.database import SessionLocal
from app.models import Organization, Client, WorkOrder
from pydantic import BaseModel

db = SessionLocal()
org = db.query(Organization).first()

from app.api.devis_online import submit_calculator, CalculatorSubmitRequest
from fastapi import Request
from starlette.datastructures import Headers
from fastapi import BackgroundTasks

class DummyRequest:
    headers = Headers()
    client = type('Client', (object,), {'host': '127.0.0.1'})()

req = DummyRequest()
bg = BackgroundTasks()

payload = CalculatorSubmitRequest(
    domain=org.domain,
    client_type="fizica",
    client_first_name="Test",
    client_last_name="Fizica",
    client_email="test@example.com",
    surface=50,
    work_type="new"
)

submit_calculator(req, payload, bg, db)

wo = db.query(WorkOrder).order_by(WorkOrder.created_at.desc()).first()
print(wo.client.client_type)
