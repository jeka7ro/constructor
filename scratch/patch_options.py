import re
import glob

def remove_emojis_from_options(content):
    # Regex to match <option ...>EMOJI TEXT</option>
    # We'll just manually replace the specific ones since we know them
    replacements = [
        ("🇫🇷 ", ""),
        ("🇬🇧 ", ""),
        ("🇳🇱 ", ""),
        ("🇩🇪 ", ""),
        ("🇷🇴 ", ""),
        ("🇷🇺 ", ""),
        ("🇮🇹 ", ""),
        ("🇪🇸 ", "")
    ]
    for emoji, empty in replacements:
        content = content.replace(emoji, empty)
    return content

for file_path in glob.glob("frontend/src/**/*.jsx", recursive=True):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = remove_emojis_from_options(content)
    
    if new_content != content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Patched emojis in {file_path}")

print("Done removing emojis from options/text")
