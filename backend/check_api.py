import requests
import os
from dotenv import load_dotenv

load_dotenv()

# We need an admin token. Let's mint one directly using the same logic.
from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM")

expire = datetime.utcnow() + timedelta(minutes=15)
to_encode = {"sub": "carabetiulian@gmail.com", "exp": expire}
encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

res = requests.get("http://127.0.0.1:8000/api/admin/clients", headers={"Authorization": f"Bearer {encoded_jwt}"})
print("Status Code:", res.status_code)
print("Response:", res.json())
