const fs = require('fs');
const babel = require('@babel/core');
try {
  babel.parseSync(fs.readFileSync('frontend/src/pages/employee/EmployeeFleetMap.jsx', 'utf8'), {
    filename: 'EmployeeFleetMap.jsx',
    presets: ['@babel/preset-react']
  });
  console.log("No syntax errors found.");
} catch (e) {
  console.error(e.message);
}
