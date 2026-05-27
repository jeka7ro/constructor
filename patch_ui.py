import os

FRONTEND_DIR = '/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/frontend/src'

emojis = ['📋', '👋', '✏️', '📝', '🔔', '👥', '📦', '🕐', '☕', '🔴', '🔄', '✅', '💡', '📍', '⚠️', '📊', '🚚', '✍️', '⚙️', '📤', '📎', '📷']

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        initial_content = content

        for emoji in emojis:
            content = content.replace(emoji + ' ', '')
            content = content.replace(emoji, '')

        content = content.replace('rounded-lg', 'rounded-full')
        content = content.replace('rounded-md', 'rounded-full')

        if content != initial_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

def main():
    count = 0
    for root, dirs, files in os.walk(FRONTEND_DIR):
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js'):
                count += 1
                process_file(os.path.join(root, file))
    print(f"Total files checked: {count}")

if __name__ == '__main__':
    main()
