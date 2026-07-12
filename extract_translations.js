const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (let file of list) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (name.endsWith('.jsx') || name.endsWith('.js')) {
      files.push(name);
    }
  }
  return files;
}

const files = getFiles('frontend/src');
const frJson = JSON.parse(fs.readFileSync('frontend/src/i18n/fr.json', 'utf8'));

// Helper to check if key exists in nested object
function hasKey(obj, keyPath) {
  const keys = keyPath.split('.');
  let current = obj;
  for (let k of keys) {
    if (!current || typeof current !== 'object') return false;
    if (!(k in current)) return false;
    current = current[k];
  }
  return true;
}

const missing = new Set();
// Regex to catch t('key', 'fallback')
const regex = /t\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;

for (let file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const fallback = match[2];
    if (!hasKey(frJson, key)) {
      missing.add(`${key} ||| ${fallback}`);
    }
  }
}

console.log(Array.from(missing).join('\n'));
