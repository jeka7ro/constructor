import re

with open("app/api/admin_logistics.py", "r") as f:
    content = f.read()

# Replace imei with flespi_device_id in the team fallback block
content = re.sub(
    r'if FLESPI_TOKEN and team_vehicle\.imei:',
    r'if FLESPI_TOKEN and getattr(team_vehicle, "flespi_device_id", None):',
    content
)

content = re.sub(
    r'str\(msg\.get\("ident", ""\)\) == str\(team_vehicle\.imei\)',
    r'str(msg.get("device_id", "")) == str(getattr(team_vehicle, "flespi_device_id", "")) or str(msg.get("channel_id", "")) == str(getattr(team_vehicle, "flespi_device_id", ""))',
    content
)

with open("app/api/admin_logistics.py", "w") as f:
    f.write(content)
