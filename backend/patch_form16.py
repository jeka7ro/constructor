import re

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'r') as f:
    content = f.read()

# 1. Update the grid layout for the Details section (Client and Locatie)
target_grid = """<div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">"""
repl_grid = """<div className="flex flex-col xl:flex-row gap-6 md:gap-8">"""

content = content.replace(target_grid, repl_grid)

target_client = """{/* 2. Client */}
                        <div className={`min-w-0 ${(!isEdit || showFullClient) ? 'md:col-span-2' : ''}`}>"""
repl_client = """{/* 2. Client */}
                        <div className={`flex-1 min-w-0`}>"""

content = content.replace(target_client, repl_client)


target_locatie = """{/* 3. Locatie + GPS */}
                        <div className={`min-w-0 ${(!isEdit || showFullSite) ? 'md:col-span-2' : ''}`}>"""
repl_locatie = """{/* 3. Locatie + GPS */}
                        <div className={`flex-1 min-w-0`}>"""

content = content.replace(target_locatie, repl_locatie)

with open('frontend/src/pages/admin/WorkOrderForm.jsx', 'w') as f:
    f.write(content)

