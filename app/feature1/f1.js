const fs = require('fs');
const path = require('path');

//add comment here
function parseProperties(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  const properties = {};

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
      const [key, value] = trimmedLine.split('=').map(part => part.trim());
      if (key && value) {
        properties[key.trim()] = value;
      }
    }


  });

  return properties;
}


function findI18nFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findI18nFiles(fullPath, files);
    } else if (entry.isFile() && entry.name === 'i18n.properties') {
      files.push(fullPath);
    }
  }
  return files;
}


function checkI18nFiles(baseDir) {
  const i18nFiles = findI18nFiles(baseDir);

  i18nFiles.forEach((filePath) => {
    const dir = path.dirname(filePath);
    const enFilePath = path.join(dir, 'i18n_en.properties');

    if (!fs.existsSync(enFilePath)) {
      console.log(`Missing i18n_en.properties for: ${filePath}`);
    } else {
      const i18nKeys = Object.keys(parseProperties(filePath));
      const enKeys = Object.keys(parseProperties(enFilePath));

      const missingKeys = i18nKeys.filter((key) => !enKeys.includes(key));
      if (missingKeys.length > 0) {
        console.log(`Missing keys in File: ${enFilePath}:`);
        missingKeys.forEach((key) => {
          console.log(` ${key}`);
        });
        console.log("\n")
      }
    }
  });
}


const baseDir = './';
checkI18nFiles(baseDir);