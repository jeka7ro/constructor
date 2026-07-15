import sys
import os
import time
from dotenv import load_dotenv

load_dotenv(".env")
from app.api.admin_logistics import geocode_address

address = "Strada Principala 1, Bucuresti"
t0 = time.time()
res = geocode_address(address)
t1 = time.time()

print(f"Result: {res}, Time: {t1 - t0:.2f}s")
