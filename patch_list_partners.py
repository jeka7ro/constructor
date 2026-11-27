with open("backend/app/api/partner_auth.py", "r") as f:
    content = f.read()

content = content.replace(
    '"allowed_team_ids": p.allowed_team_ids or [],',
    '"allowed_team_ids": p.allowed_team_ids or [],\n            "color": p.color,'
)

with open("backend/app/api/partner_auth.py", "w") as f:
    f.write(content)

print("Patched list_partners in partner_auth.py")
