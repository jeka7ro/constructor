import re

file_path = "app/services/email_service.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the chat notification email html block
old_html = """    html_content = f\"\"\"
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: {primary_color}; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Davide Chape</h1>
        </div>"""

new_html = """    html_content = f\"\"\"
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid {primary_color};">
            <img src="https://davidechape.pontaj.app/davide_logo.png" alt="Davide Chape" style="max-height: 60px;" />
        </div>"""

content = content.replace(old_html, new_html)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Email service patched")
