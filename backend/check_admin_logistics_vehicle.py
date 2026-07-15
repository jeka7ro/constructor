import re

with open("app/api/admin_logistics.py", "r") as f:
    content = f.read()

# Make sure it searches flespi_device_id and not imei for Flespi match
content = re.sub(
    r'Vehicle\.imei != None',
    r'Vehicle.flespi_device_id != None',
    content
)
content = re.sub(
    r'if FLESPI_TOKEN and v\.imei:',
    r'if FLESPI_TOKEN and getattr(v, "flespi_device_id", None):',
    content
)
content = re.sub(
    r'str\(msg\.get\("ident", ""\)\) == str\(v\.imei\)',
    r'str(msg.get("device_id", "")) == str(getattr(v, "flespi_device_id", "")) or str(msg.get("channel_id", "")) == str(getattr(v, "flespi_device_id", ""))',
    content
)

with open("app/api/admin_logistics.py", "w") as f:
    f.write(content)
