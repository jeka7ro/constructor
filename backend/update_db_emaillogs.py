from app.database import engine, Base
from app.models import EmailLog
Base.metadata.create_all(engine)
print("EmailLog table created.")
