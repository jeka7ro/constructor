import sys

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'r') as f:
    content = f.read()

target = '    return (\n        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 pb-10">'
replacement = '''    const pageContent = (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 pb-10">'''

if target not in content:
    print('Target 1 not found')
    sys.exit(1)

content = content.replace(target, replacement)

last_paren_idx = content.rfind('    )\n}')

if last_paren_idx == -1:
    print('Target 2 not found')
    sys.exit(1)

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

with open('frontend/src/pages/admin/WorkOrderDetail.jsx', 'w') as f:
    f.write(content)
print('Success')
