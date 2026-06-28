import requests
import os
from dotenv import load_dotenv

load_dotenv()
from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM")

expire = datetime.utcnow() + timedelta(minutes=15)
to_encode = {
    "sub": "29b68353-9a86-4ac1-85f1-e23c8cddd968",
    "email": "carabetiulian@gmail.com"
}
encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

headers = {"Authorization": f"Bearer {encoded_jwt}"}
res = requests.get("https://davidechape.pontaj.app/api/admin/clients", headers=headers)
print("Status:", res.status_code)
try:
    data = res.json()
    print("Items count:", len(data))
    if len(data) > 0:
        print("First item:", data[0].get('name'))
    else:
        print("Response body:", data)
except Exception as e:
    print("Error parsing json:", e)
    print("Raw text:", res.text[:200])
