import os
import sys
from dotenv import load_dotenv

load_dotenv('.env')

from sqlalchemy import select
from app.database import SessionLocal
from app.models import User
from PIL import Image

def main():
    session = SessionLocal()
    user = session.execute(select(User).filter_by(full_name='Catana Costel')).scalars().first()
    if user:
        print(f"Found user {user.id}, avatar: {user.avatar_path}")
        if user.avatar_path:
            rel_path = user.avatar_path.replace('/api/', '')
            file_path = os.path.join(os.path.dirname(__file__), rel_path)
            if os.path.exists(file_path):
                img = Image.open(file_path)
                img = img.rotate(180)
                img.save(file_path)
                print(f"Rotated {file_path} 180 degrees")
            else:
                print(f"File not found: {file_path}")
    else:
        print("User not found")
    session.close()

if __name__ == '__main__':
    main()
