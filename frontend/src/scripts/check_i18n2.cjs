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

const srcDir = path.join(__dirname, '..');
const files = glob.sync(`${srcDir}/**/*.{js,jsx}`);

const keys = new Set();
// A better regex that ignores t(variable) or t(`template`) and only gets strings
// t('key') or t("key") or t('key', 'default')
const regex = /t\(\s*['"]([a-zA-Z0-9_\.\-]+)['"]\s*(?:,[^)]*)?\)/g;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        // filter out obvious false positives like file paths if they accidentally matched
        if (!match[1].startsWith('./') && match[1].includes('.')) {
            keys.add(match[1]);
        } else if (match[1].length > 1 && !match[1].includes('/')) {
            keys.add(match[1]); // single word keys
        }
    }
});

console.log(`Found ${keys.size} valid translation keys used in code.`);

const missingKeys = {};

keys.forEach(key => {
    langs.forEach(lang => {
        if (!hasKey(translations[lang], key)) {
            if (!missingKeys[lang]) missingKeys[lang] = [];
            missingKeys[lang].push(key);
        }
    });
});

let totalMissing = 0;
langs.forEach(lang => {
    if (missingKeys[lang]) {
        console.log(`\n--- Missing in ${lang}.json (${missingKeys[lang].length} keys) ---`);
        totalMissing += missingKeys[lang].length;
        console.log(missingKeys[lang].slice(0, 50).join(', '));
    }
});

console.log(`\nTotal missing translations across all files: ${totalMissing}`);
