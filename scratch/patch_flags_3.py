import re

file_path = "frontend/src/pages/admin/WorkOrders.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the flag object in the array (optional, but let's just replace the render)
search = r'<span className="text-2xl">\{lang.flag\}</span>'
replace = '<img src={`https://flagcdn.com/w40/${lang.id === \'en\' ? \'gb\' : lang.id}.png`} alt={lang.id} className="w-[24px] h-[18px] object-cover rounded-sm shadow-sm opacity-90" />'

content = re.sub(search, replace, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Flags patched in WorkOrders.jsx")
