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

function setKey(obj, keyPath, value) {
    const parts = keyPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

const srcDir = path.join(__dirname, '..');
const files = glob.sync(`${srcDir}/**/*.{js,jsx}`);

const keysWithDefaults = new Map();
// match t('key', 'default') or t("key", "default")
// This regex tries to capture the default string as well
const regex = /t\(\s*['"]([a-zA-Z0-9_\.\-]+)['"]\s*(?:,\s*['"]([^'"]*)['"])?\)/g;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        const defaultStr = match[2];
        if (key && !key.startsWith('./') && key.includes('.')) {
             if (defaultStr && !keysWithDefaults.has(key)) {
                 keysWithDefaults.set(key, defaultStr);
             } else if (!keysWithDefaults.has(key)) {
                 keysWithDefaults.set(key, key);
             }
        } else if (key && key.length > 1 && !key.includes('/')) {
             if (defaultStr && !keysWithDefaults.has(key)) {
                 keysWithDefaults.set(key, defaultStr);
             } else if (!keysWithDefaults.has(key)) {
                 keysWithDefaults.set(key, key);
             }
        }
    }
});

console.log(`Found ${keysWithDefaults.size} valid translation keys used in code.`);

let addedCount = 0;
langs.forEach(lang => {
    let addedForLang = 0;
    keysWithDefaults.forEach((defaultStr, key) => {
        if (!hasKey(translations[lang], key)) {
            // Note: In a real app we'd want to actually translate this, 
            // but the user just wants the keys to exist so the app doesn't break
            // or show missing keys. We will put the default string or the key itself.
            setKey(translations[lang], key, defaultStr);
            addedForLang++;
            addedCount++;
        }
    });
    
    if (addedForLang > 0) {
        fs.writeFileSync(
            path.join(i18nDir, `${lang}.json`), 
            JSON.stringify(translations[lang], null, 4), 
            'utf-8'
        );
        console.log(`Added ${addedForLang} missing keys to ${lang}.json`);
    }
});

console.log(`\nTotal added missing translations across all files: ${addedCount}`);
