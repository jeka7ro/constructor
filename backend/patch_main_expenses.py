import re

file_path = "/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/backend/main.py"
with open(file_path, "r") as f:
    content = f.read()

# Add import
if "admin_expenses" not in content:
    content = content.replace("admin_accommodations", "admin_accommodations, admin_expenses")

# Add include_router
if "admin_expenses.router" not in content:
    content = content.replace('app.include_router(admin_accommodations.router, prefix="/api", tags=["admin-accommodations"])', 
                              'app.include_router(admin_accommodations.router, prefix="/api", tags=["admin-accommodations"])\napp.include_router(admin_expenses.router, prefix="/api", tags=["admin-expenses"])')

# Add migration
migration_str = """        "ALTER TABLE warehouse_transactions ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(255);",
        \"\"\"CREATE TABLE IF NOT EXISTS expenses (
            id VARCHAR(36) PRIMARY KEY,
            organization_id VARCHAR(36) NOT NULL,
            site_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36),
            category VARCHAR(50) NOT NULL,
            amount FLOAT NOT NULL,
            currency VARCHAR(10) DEFAULT 'RON',
            date DATE NOT NULL,
            description TEXT,
            document_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );\"\"\""""

if "CREATE TABLE IF NOT EXISTS expenses" not in content:
    content = content.replace('"ALTER TABLE warehouse_transactions ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(255);"', migration_str)

with open(file_path, "w") as f:
    f.write(content)
