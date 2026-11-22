import re

with open('frontend/src/pages/partner/PartnerDashboard.jsx', 'r') as f:
    content = f.read()

# Remove the Sub-Navigation (Tabs) block
pattern = r'\{\/\*\s*──\s*Sub-Navigation \(Tabs\)\s*──\s*\*\/\}.*?</div>\s*</div>\s*</div>'
new_content = re.sub(pattern, '', content, flags=re.DOTALL)

with open('frontend/src/pages/partner/PartnerDashboard.jsx', 'w') as f:
    f.write(new_content)

print("Patched PartnerDashboard.jsx")
