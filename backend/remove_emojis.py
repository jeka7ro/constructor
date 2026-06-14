import sys
import re

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'r') as f:
    content = f.read()

# Remove emojis
content = content.replace("<span>✅ ", "<span>")
content = content.replace("<span>👀 ", "<span>")
content = content.replace("<span>⏳ ", "<span>")
content = content.replace("📝 ", "")

# While here, I will also fix any other emojis if I see them
content = content.replace("⚠️ ", "")

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'w') as f:
    f.write(content)
print("Removed emojis")
