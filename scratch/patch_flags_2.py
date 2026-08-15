import re

files = [
    "frontend/src/components/LocalDevisWizard.jsx",
    "frontend/src/pages/PublicCalculator.jsx",
    "frontend/src/pages/DevisOnline.jsx"
]

search = r"<span className=\"text-xs sm:text-sm\">\{lang === 'fr' \? '🇫🇷' : lang === 'nl' \? '🇳🇱' : '🇬🇧'\}</span>"
replace = '<img src={`https://flagcdn.com/w20/${lang === \'en\' ? \'gb\' : lang}.png`} alt={lang} className="w-[18px] h-[13px] object-cover shadow-sm rounded-sm" />'

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    content = re.sub(search, replace, content)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
print("Flags patched in DevisOnline and PublicCalculator")
