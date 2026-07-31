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
// match t('key', 'default') or t("key", "default")
const regex = /t\(\s*['"]([^'"]+)['"]/g;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.add(match[1]);
    }
});

console.log(`Found ${keys.size} unique keys used in code.`);

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
        console.log(missingKeys[lang].slice(0, 10).join(', ') + ' ...');
    }
});

console.log(`\nTotal missing translations across all files: ${totalMissing}`);
