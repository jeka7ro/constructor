import sys

with open('frontend/src/pages/admin/AdminOverview.jsx', 'r') as f:
    content = f.read()

target = '''                            onOrderEdit={(wo) => {
                                setQuickEditOrder(wo);'''

replacement = '''                            onOrderClick={(wo) => {
                                if (isCalendarFull) {
                                    setFullscreenOrderId(wo.id);
                                } else {
                                    navigate(`/admin/work-orders/${wo.id}`);
                                }
                            }}
                            onOrderEdit={(wo) => {
                                setQuickEditOrder(wo);'''

if target not in content:
    print("Could not find target")
    sys.exit(1)

content = content.replace(target, replacement)

with open('frontend/src/pages/admin/AdminOverview.jsx', 'w') as f:
    f.write(content)
print("Success")
