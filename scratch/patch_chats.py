import re

file_path = "frontend/src/pages/admin/AdminChats.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

search = r"""    const getFlagEmoji = \(lang\) => \{
        if \(!lang\) return '🇷🇴';
        const l = lang\.toLowerCase\(\);
        if \(l === 'nl'\) return '🇳🇱';
        if \(l === 'fr'\) return '🇫🇷';
        if \(l === 'en'\) return '🇬🇧';
        return '🇷🇴';
    \};"""

replace = """    const getFlagEmoji = (lang) => {
        if (!lang) return <img src="https://flagcdn.com/w20/ro.png" alt="ro" className="w-[18px] h-[13px] object-cover rounded-sm shadow-sm inline" />;
        const l = lang.toLowerCase();
        const code = l === 'en' ? 'gb' : l;
        return <img src={`https://flagcdn.com/w20/${code}.png`} alt={l} className="w-[18px] h-[13px] object-cover rounded-sm shadow-sm inline" />;
    };"""

content = re.sub(search, replace, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("AdminChats.jsx getFlagEmoji patched")
