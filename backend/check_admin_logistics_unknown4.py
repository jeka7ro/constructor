import re

with open("../frontend/src/pages/admin/logistics/LogisticsDashboard.jsx", "r") as f:
    content = f.read()

content = re.sub(
    r"\? t\('common\.unknown_client', 'Client necunoscut'\) : wp\.name",
    r"? wp.name : wp.name",
    content
)

with open("../frontend/src/pages/admin/logistics/LogisticsDashboard.jsx", "w") as f:
    f.write(content)
