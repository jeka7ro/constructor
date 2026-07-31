from app.database import engine
from app.models import WorkOrderMessage

def create_table():
    print("Creating work_order_messages table...")
    WorkOrderMessage.metadata.create_all(engine)
    print("Table created successfully!")

if __name__ == "__main__":
    create_table()
