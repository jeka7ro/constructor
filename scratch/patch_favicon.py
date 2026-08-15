import re

file_path = "frontend/src/App.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

favicon_code = """
    // Dynamically update favicon and title
    useEffect(() => {
        if (tenant) {
            if (tenant.favicon_url || tenant.logo_url) {
                let link = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.getElementsByTagName('head')[0].appendChild(link);
                }
                link.href = tenant.favicon_url || tenant.logo_url;
            }
            if (tenant.name) {
                document.title = tenant.name;
            }
        }
    }, [tenant]);
"""

if "Dynamically update favicon" not in content:
    content = content.replace("const tenant = useTenantStore(s => s.tenant);", "const tenant = useTenantStore(s => s.tenant);\n" + favicon_code)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("App.jsx patched with dynamic favicon")
