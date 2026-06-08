import sys
from app.database import engine
from app.models import Base

# Create missing tables
Base.metadata.create_all(bind=engine)
print("Tables created/verified.")
