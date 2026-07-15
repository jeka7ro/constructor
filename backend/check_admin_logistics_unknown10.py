import re

with open("../frontend/src/pages/admin/logistics/LogisticsDashboard.jsx", "r") as f:
    content = f.read()

content = re.sub(
    r"\{\(wp\.name === 'UNKNOWN_CLIENT_LOGISTICS' \|\| wp\.name === 'Client necunoscut'\) \? wp\.name \: wp\.name\}",
    r"{wp.name === 'UNKNOWN_CLIENT_LOGISTICS' ? 'Client necunoscut' : wp.name}",
    content
)

with open("../frontend/src/pages/admin/logistics/LogisticsDashboard.jsx", "w") as f:
    f.write(content)
