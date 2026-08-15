import re

file_path = "frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add useTenantStore import if it's missing
if "useTenantStore" not in content:
    content = content.replace(
        "import { useTranslation }",
        "import { useTenantStore } from '../../store/tenantStore';\nimport { useTranslation }"
    )

# Extract tenant
if "const tenant = useTenantStore(s => s.tenant)" not in content:
    content = content.replace(
        "const navigate = useNavigate();",
        "const navigate = useNavigate();\n    const tenant = useTenantStore(s => s.tenant);"
    )

# Fix the avatar
old_avatar = """<span className="w-5 h-5 rounded-full bg-white text-blue-600 hidden md:flex items-center justify-center font-bold text-[10px] shrink-0">DC</span>"""
new_avatar = """(tenant?.favicon_url || tenant?.logo_url) ? (
                                                                <img src={tenant.favicon_url ? getImageUrl(tenant.favicon_url) : getImageUrl(tenant.logo_url)} alt="Davide Chape" className="w-5 h-5 rounded-full object-contain bg-white p-[2px] shrink-0 hidden md:block" />
                                                            ) : (
                                                                <span className="w-5 h-5 rounded-full bg-white text-blue-600 hidden md:flex items-center justify-center font-bold text-[10px] shrink-0">DC</span>
                                                            )"""

content = content.replace(old_avatar, new_avatar)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Avatar patched in WorkOrderDetail.jsx")
