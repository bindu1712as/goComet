const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..', 'allure-results');

function removeContents(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  for (const name of fs.readdirSync(dirPath)) {
    const p = path.join(dirPath, name);
    const stat = fs.lstatSync(p);
    if (stat.isDirectory()) {
      fs.rmSync(p, { recursive: true, force: true });
    } else {
      fs.unlinkSync(p);
    }
  }
}

try {
  removeContents(dir);
  console.log('allure-results cleaned');
} catch (err) {
  console.error('Failed to clean allure-results:', err);
  process.exit(1);
}
