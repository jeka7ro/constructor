import sys, os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.orm import Session
from app.database import engine
from app.api.clockin import get_live_vehicles

try:
    with Session(engine) as db:
        res = get_live_vehicles(db=db)
        print("Success! Got", len(res), "items")
        for v in res:
            if v['type'] == 'vehicle':
                print(f"{v['name']} | Dist: {v.get('distance_today')} km | Loc: {v.get('location_text')}")
except Exception as e:
    import traceback
    traceback.print_exc()
