import sys

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# Fix navigate(-1) inside WorkOrderForm
content = content.replace("onClick={() => navigate(-1)}", "onClick={() => onBack ? onBack() : navigate(-1)}")
content = content.replace("navigate('/admin/work-orders')", "onSuccess ? onSuccess() : navigate('/admin/work-orders')")

# Also, use initialDate/initialTime if provided
# Search for: const [searchParams] = useSearchParams()
# Then we can do: const dateParam = initialDate || searchParams.get('date')
content = content.replace(
    "const dateParam = searchParams.get('date')",
    "const dateParam = initialDate || searchParams.get('date')"
)
content = content.replace(
    "const timeParam = searchParams.get('time')",
    "const timeParam = initialTime || searchParams.get('time')"
)

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)
print("Success")
