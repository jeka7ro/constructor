import re

f = 'frontend/src/pages/employee/WorkerOrdersPage.jsx'
with open(f, 'r') as file:
    c = file.read()

old_state = "const [saving, setSaving] = useState(false)"
new_state = "const [showOtherMaterials, setShowOtherMaterials] = useState(false)\n    const [saving, setSaving] = useState(false)"

if old_state in c:
    c = c.replace(old_state, new_state)
    with open(f, 'w') as file:
        file.write(c)
    print("Fixed!")
else:
    print("Could not find old_state")

