import re

file_path = "frontend/src/pages/public/WorkOrderConfirm.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

translate_fn = """
    const translateItemName = (name, targetLang) => {
        if (!name) return name;
        if (targetLang === 'fr') return name; // e deja in franceza in DB
        
        const n = name.toLowerCase();
        
        if (targetLang === 'en') {
            if (n.includes('chape')) return name.replace(/chape/i, 'Screed');
            if (n.includes('isolation') || n.includes('pur') || n.includes('eps')) return name.replace(/isolation/i, 'Insulation');
            if (n.includes('transport')) return 'Transport';
            if (n.includes('pompage')) return 'Pumping';
            if (n.includes('supplément')) return name.replace(/supplément/i, 'Extra').replace(/épaisseur/i, 'thickness');
        }
        
        if (targetLang === 'nl') {
            if (n.includes('chape')) return name.replace(/chape/i, 'Chape'); // In olandeza se foloseste tot Chape
            if (n.includes('isolation') || n.includes('pur') || n.includes('eps')) return name.replace(/isolation/i, 'Isolatie');
            if (n.includes('transport')) return 'Transport';
            if (n.includes('pompage')) return 'Pompen';
            if (n.includes('supplément')) return name.replace(/supplément/i, 'Extra').replace(/épaisseur/i, 'dikte');
        }
        
        if (targetLang === 'ro') {
            if (n.includes('chape')) return name.replace(/chape/i, 'Șapă');
            if (n.includes('isolation') || n.includes('pur') || n.includes('eps')) return name.replace(/isolation/i, 'Izolație');
            if (n.includes('transport')) return 'Transport';
            if (n.includes('pompage')) return 'Pompare';
            if (n.includes('supplément')) return name.replace(/supplément/i, 'Supliment').replace(/épaisseur/i, 'grosime');
        }
        
        return name;
    };
"""

if "translateItemName" not in content:
    content = content.replace("const handleSaveAddress = async () => {", translate_fn + "\n    const handleSaveAddress = async () => {")

content = content.replace(">{item.name}<", ">{translateItemName(item.name, lang)}<")
content = content.replace(">{item.name} {item.description", ">{translateItemName(item.name, lang)} {item.description")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("WorkOrderConfirm patched")
