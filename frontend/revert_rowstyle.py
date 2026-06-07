import re

with open("src/pages/admin/WorkOrders.jsx", "r") as f:
    code = f.read()

old_code = """                    emptyText={filterStatus ? `Nicio comandă cu statusul "${STATUS_CONFIG[filterStatus]?.label}"` : 'Nicio comandă de lucru'}
                    onRowClick={(wo) => navigate(`/admin/work-orders/${wo.id}`)}"""

new_code = """                    emptyText={filterStatus ? `Nicio comandă cu statusul "${STATUS_CONFIG[filterStatus]?.label}"` : 'Nicio comandă de lucru'}
                    rowStyle={(wo) => wo.assigned_team_color ? {
                        backgroundColor: `${wo.assigned_team_color}08`,
                        boxShadow: `inset 4px 0 0 ${wo.assigned_team_color}`
                    } : undefined}
                    onRowClick={(wo) => navigate(`/admin/work-orders/${wo.id}`)}"""

code = code.replace(old_code, new_code)

with open("src/pages/admin/WorkOrders.jsx", "w") as f:
    f.write(code)

