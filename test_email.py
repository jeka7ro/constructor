import os
import sys
from dotenv import load_dotenv

# load env manually
load_dotenv('backend/.env')

from backend.app.services.email_service import send_planning_update_email

import httpx
print("Testing email service...")
result = send_planning_update_email('jeka7ro@gmail.com', 'Eugeniu Cazmal', 'fr', 'https://davidechape.pontaj.app', '29/07/2026')
print(f"Result: {result}")
