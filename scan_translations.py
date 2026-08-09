import os
import re

FRONTEND_DIR = "/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/frontend/src"
BACKEND_DIR = "/Users/eugeniucazmal/Downloads/dev_office/Client B - pontaje/backend/app"

EXCLUDED_FILES = [
    'public_calculator',
    'devis_online',
    'We-R',
    'Jordi'
]

def should_exclude(filepath):
    for ex in EXCLUDED_FILES:
        if ex.lower() in filepath.lower():
            return True
    return False

def scan_frontend():
    print("## Frontend (JSX) Untranslated Strings")
    # Simple regex to find text between tags that doesn't contain t(
    # This is a heuristic and might have false positives, but good for a report
    tag_regex = re.compile(r'>\s*([^<>{]+?)\s*<')
    
    for root, dirs, files in os.walk(FRONTEND_DIR):
        for file in files:
            if file.endswith(('.jsx', '.js')) and not should_exclude(os.path.join(root, file)):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    try:
                        content = f.read()
                    except:
                        continue
                        
                    matches = tag_regex.findall(content)
                    untranslated = []
                    for match in matches:
                        text = match.strip()
                        # Ignore numbers, single chars, or common symbols
                        if len(text) > 1 and not text.isnumeric() and not re.match(r'^[^\w]+$', text):
                            if 't(' not in text and 'i18n' not in text:
                                untranslated.append(text)
                    
                    if untranslated:
                        rel_path = os.path.relpath(filepath, FRONTEND_DIR)
                        print(f"**{rel_path}**")
                        for t in set(untranslated):
                            print(f"- `{t}`")
                        print()

def scan_backend():
    print("## Backend (Emails) Hardcoded Strings")
    # Look for files sending emails or generating PDFs
    target_files = ['admin_emails.py', 'pdf_generator.py']
    
    for root, dirs, files in os.walk(BACKEND_DIR):
        for file in files:
            if file in target_files and not should_exclude(os.path.join(root, file)):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.readlines()
                    
                rel_path = os.path.relpath(filepath, BACKEND_DIR)
                print(f"**{rel_path}**")
                for i, line in enumerate(content):
                    # Very basic check for string literals in email sending functions
                    if 'subject=' in line or 'body=' in line or 'html=' in line:
                        print(f"- L{i+1}: `{line.strip()}`")
                print()

if __name__ == "__main__":
    scan_frontend()
    scan_backend()
