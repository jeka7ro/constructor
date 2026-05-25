import sys
from app.api.auth import create_access_token
from datetime import timedelta

token = create_access_token(data={"sub": "jeka7ro@gmail.com", "role": "admin"}, expires_delta=timedelta(minutes=30))
print(token)
