import re

file_path = "frontend/src/pages/admin/WorkOrderDetail.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

search = r"""const getLanguageFlag = \(lang\) => \{
    const l = lang\?\.toLowerCase\(\);
    if \(l === 'ro'\) return '🇷🇴';
    if \(l === 'fr'\) return '🇫🇷';
    if \(l === 'en'\) return '🇬🇧';
    if \(l === 'de'\) return '🇩🇪';
    if \(l === 'it'\) return '🇮🇹';
    if \(l === 'es'\) return '🇪🇸';
    if \(l === 'nl'\) return '🇳🇱';
    if \(l === 'ru'\) return '🇷🇺';
    return '';
\};"""

replace = """const getLanguageFlag = (lang) => {
    const l = lang?.toLowerCase();
    if (!l) return null;
    const code = l === 'en' ? 'gb' : l;
    return <img src={`https://flagcdn.com/w20/${code}.png`} alt={l} className="w-[18px] h-[13px] object-cover rounded-sm shadow-sm inline" />;
};"""

content = re.sub(search, replace, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("WorkOrderDetail getLanguageFlag patched")
