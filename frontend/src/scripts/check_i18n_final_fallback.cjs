const fs = require('fs');
const path = require('path');

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

// Since "lang" is already a string in fr.json, en.json, etc., we can't add "lang.ro", "lang.en".
// Let's delete the string "lang" if it exists, and replace it with an object containing these keys.
const newKeys = ['ro', 'en', 'fr', 'de', 'nl', 'ru'];

langs.forEach(langCode => {
    if (typeof translations[langCode]['lang'] === 'string') {
        translations[langCode]['lang'] = {};
    }
    if (!translations[langCode]['lang']) {
        translations[langCode]['lang'] = {};
    }
    
    newKeys.forEach(k => {
        translations[langCode]['lang'][k] = k.toUpperCase();
    });
    
    fs.writeFileSync(
        path.join(i18nDir, `${langCode}.json`), 
        JSON.stringify(translations[langCode], null, 4), 
        'utf-8'
    );
});
console.log('Fixed lang object');
