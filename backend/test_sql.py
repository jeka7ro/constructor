from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.models import WorkOrder
from sqlalchemy.dialects import postgresql

query = WorkOrder.client_id == "e12b7a95-ef29-4e00-8c20-a6164fb02b28"
print(query)
