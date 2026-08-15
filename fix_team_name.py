import os
import glob

files = glob.glob("frontend/src/pages/admin/**/*.jsx", recursive=True) + glob.glob("frontend/src/components/**/*.jsx", recursive=True)

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Înlocuim fallback-ul literal
    if "t('admin.team', 'Équipe Davide Chape')" in content:
        content = content.replace("t('admin.team', 'Équipe Davide Chape')", "tenant?.name || t('admin.team', 'Équipe')")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {file_path}")

print("Done fixing fallback")
