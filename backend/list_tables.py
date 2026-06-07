import sys
import os
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import inspect

def main():
    inspector = inspect(engine)
    print(inspector.get_table_names())

if __name__ == "__main__":
    main()
