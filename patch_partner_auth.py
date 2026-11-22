with open("backend/app/api/partner_auth.py", "r") as f:
    content = f.read()

# Patch create_partner
content = content.replace(
    "allowed_team_ids=payload.allowed_team_ids or [],",
    "allowed_team_ids=payload.allowed_team_ids or [],\n        color=payload.color or '#3b82f6',"
)

# Patch update_partner
content = content.replace(
    "    if payload.allowed_team_ids is not None:\n        partner.allowed_team_ids = payload.allowed_team_ids\n    \n    db.commit()",
    "    if payload.allowed_team_ids is not None:\n        partner.allowed_team_ids = payload.allowed_team_ids\n        \n    if payload.color is not None:\n        partner.color = payload.color\n    \n    db.commit()"
)

with open("backend/app/api/partner_auth.py", "w") as f:
    f.write(content)

print("Patched partner_auth.py")
