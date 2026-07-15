import re

with open("frontend/src/pages/admin/logistics/LogisticsDashboard.jsx", "r") as f:
    content = f.read()

content = re.sub(
    r"wp\.name === 'UNKNOWN_CLIENT_LOGISTICS' \|\| wp\.name === 'Client necunoscut'",
    r"wp.name === 'UNKNOWN_CLIENT_LOGISTICS'",
    content
)

content = re.sub(
    r"\? t\('common\.unknown_client', 'Client necunoscut'\)",
    r"? 'Client necunoscut la echipa pentru aiz'",
    content
)

with open("frontend/src/pages/admin/logistics/LogisticsDashboard.jsx", "w") as f:
    f.write(content)
