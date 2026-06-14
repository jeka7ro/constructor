import sys

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# 1. Update signature
target_sig = "export default function WorkOrderForm() {"
replacement_sig = "export default function WorkOrderForm({ isEmbedded, initialDate, initialTime, onBack, onSuccess }) {"

if target_sig in content:
    content = content.replace(target_sig, replacement_sig)

# 2. Add wrapper logic
target_return = '''    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-10">'''

replacement_return = '''    const pageContent = (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-10">'''

if target_return in content:
    content = content.replace(target_return, replacement_return)

last_paren_idx = content.rfind('    )\n}')
if last_paren_idx != -1:
    new_end = '''    )
    if (isEmbedded) {
        return (
            <div className="fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-950 overflow-y-auto w-full h-full">
                {pageContent}
            </div>
        )
    }
    return pageContent;
}'''
    content = content[:last_paren_idx] + new_end

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)
print("Success")
