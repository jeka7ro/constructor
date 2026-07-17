import sys

with open("backend/app/api/admin_logistics.py", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "segment = {" in line and lines[i-1].strip() == "team_distance_km += dist_from_prev":
        print(f"Found segment assignment at line {i}")

