import smtplib
from dotenv import load_dotenv
import os

load_dotenv()

user = os.getenv("SMTP_USERNAME")
pwd = os.getenv("SMTP_PASSWORD")

try:
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(user, pwd)
        print("SMTP Auth Successful!")
except Exception as e:
    print(f"Failed: {e}")
