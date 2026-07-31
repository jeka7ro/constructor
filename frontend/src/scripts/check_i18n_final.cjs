const fs = require('fs');
const path = require('path');
const glob = require('glob');

const i18nDir = path.join(__dirname, '../i18n');
const langs = ['ro', 'fr', 'en', 'de', 'nl'];
const translations = {};

langs.forEach(lang => {
    try {
        const fileContent = fs.readFileSync(path.join(i18nDir, `${lang}.json`), 'utf-8');
        translations[lang] = JSON.parse(fileContent);
    } catch (e) {
        console.error(`Error loading ${lang}.json`);
    }
});

function hasKey(obj, keyPath) {
    if (typeof keyPath !== 'string') return true;
    const parts = keyPath.split('.');
    let current = obj;
    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            return false;
        }
    }
    return true;
}

const srcDir = path.join(__dirname, '..');
const files = glob.sync(`${srcDir}/**/*.{js,jsx}`);

const keys = new Set();
const regex1 = /t\(\s*['"]([a-zA-Z0-9_\.\-]+)['"]\s*(?:,\s*['"]([^'"]*)['"])?\)/g;
const regex2 = /t\(\s*['"]([^'"]+)['"]/g; // More generic for fallback

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    while ((match = regex1.exec(content)) !== null) {
        if (match[1] && typeof match[1] === 'string' && !match[1].startsWith('./') && match[1].includes('.')) {
            keys.add(match[1]);
        }
    }
    while ((match = regex2.exec(content)) !== null) {
        if (match[1] && typeof match[1] === 'string' && !match[1].startsWith('./') && match[1].includes('.')) {
            keys.add(match[1]);
        }
    }
});

let totalMissing = 0;
keys.forEach(key => {
    langs.forEach(lang => {
        if (!hasKey(translations[lang], key)) {
            const parts = key.split('.');
            let current = translations[lang];
            let isValid = true;
            for (let i = 0; i < parts.length - 1; i++) {
                if (typeof current[parts[i]] === 'string') {
                    // Conflicting key path (e.g. 'auth' is a string, but we try to set 'auth.login')
                    isValid = false;
                    break;
                }
                if (!current[parts[i]]) current[parts[i]] = {};
                current = current[parts[i]];
            }
            if (isValid) {
                current[parts[parts.length - 1]] = key; // default to the key itself
                totalMissing++;
            }
        }
    });
});

if (totalMissing > 0) {
    langs.forEach(lang => {
        fs.writeFileSync(
            path.join(i18nDir, `${lang}.json`), 
            JSON.stringify(translations[lang], null, 4), 
            'utf-8'
        );
    });
}
console.log(`Final sweep: Added ${totalMissing} more keys.`);
