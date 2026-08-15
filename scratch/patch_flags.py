import re

file_path = "frontend/src/pages/public/WorkOrderConfirm.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the flag object
flag_search = r"\{ code: 'fr', label: 'FR', flag: '🇫🇷' \},\s*\{ code: 'nl', label: 'NL', flag: '🇳🇱' \},\s*\{ code: 'en', label: 'EN', flag: '🇬🇧' \}"
flag_replace = "{ code: 'fr', label: 'FR' },\n                                { code: 'nl', label: 'NL' },\n                                { code: 'en', label: 'EN' }"

content = re.sub(flag_search, flag_replace, content)

# Replace the rendering
render_search = r'<span className="text-sm leading-none">\{l\.flag\}</span>'
render_replace = '<img src={`https://flagcdn.com/w20/${l.code === \'en\' ? \'gb\' : l.code}.png`} alt={l.label} className="w-4 h-[11px] object-cover rounded-sm opacity-80" />'

content = re.sub(render_search, render_replace, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Flags patched with flagcdn images in WorkOrderConfirm.jsx")
