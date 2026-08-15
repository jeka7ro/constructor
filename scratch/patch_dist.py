import re

file_path = "backend/app/api/public_calculator.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace get_driving_distance_km to use settings
dist_func_search = r"def get_driving_distance_km.*?api_key = os\.getenv\(\"GOOGLE_MAPS_API_KEY\"\)"
dist_func_replace = """def get_driving_distance_km(origin: str, destination: str) -> float:
    import requests
    from app.config import settings
    api_key = settings.GOOGLE_MAPS_API_KEY"""

content = re.sub(dist_func_search, dist_func_replace, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Distance calculation patched")
