import re

file_path = "app/services/email_service.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I will find all instances where client_language is used and prepend `client_language = client_language.lower()[:2] if client_language else "fr"`
# Or better yet, just patch the top of the file to include a helper function, or patch the top of each send_ function.
# Let's just find `def send_chat_notification_email` and inject it.

old_chat = "def send_chat_notification_email(to_email: str, client_name: str, client_language: str, chat_url: str, org_id: str = None, wo_id: str = None):\n"
new_chat = old_chat + "    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'\n"

content = content.replace(old_chat, new_chat)

old_quote = "def send_quote_email(to_email: str, client_name: str, client_language: str, signing_url: str, pdf_path: str = None, org_id: str = None, wo_id: str = None):\n"
new_quote = old_quote + "    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'\n"
content = content.replace(old_quote, new_quote)

old_plan = "def send_planning_update_email(to_email: str, client_name: str, client_language: str, signing_url: str, new_date: str, org_id: str = None, wo_id: str = None):\n"
new_plan = old_plan + "    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'\n"
content = content.replace(old_plan, new_plan)

old_upd = "def send_quote_update_email(to_email: str, client_name: str, client_language: str, signing_url: str, discount_pct: float = 0, org_id: str = None, wo_id: str = None):\n"
new_upd = old_upd + "    client_language = str(client_language).lower().split('-')[0].strip() if client_language else 'fr'\n"
content = content.replace(old_upd, new_upd)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Language logic patched!")
