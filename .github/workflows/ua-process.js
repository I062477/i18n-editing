const util = require('util')
const exec = util.promisify(require('child_process').exec)
const fs = require('fs')
const path = require('path');



function mapToObject(map) {
  const obj = {};
  for (const [key, value] of map.entries()) {
    obj[key] = value;
  }
  return obj;
}

/**
 * 
 * @param {*} filePath 
 * Path to the properties file
 * @param {*} key 
 * key to be added or updated
 * @param {*} value 
 * value to be added or updated
 * @param {*} operation 
 * A - Add a new key-value pair
 * U - Update an existing key with a new value
 * D - Delete an existing key
 * 
 */
function updatePropFile(filePath, key, value, operation) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    //if file does not exist, create an empty file, 
    //this is to ensure that the file exists before we try to read it
    fs.writeFileSync(absolutePath, '', 'utf-8');
  }

  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  const lines = fileContent.split('\n');

  let updatedLines = [];
  let keyExists = false;

  lines.forEach(line => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      updatedLines.push(line);
      return;
    }

    const [currentKey, ...currentValueParts] = trimmedLine.split('=');
    const currentValue = currentValueParts.join('=').trim();

    if (currentKey.trim() === key) {
      keyExists = true;
      if (operation === 'A') {
        console.warn(`Key "${key}" already exists. do UPDATE instead.`);
        updatedLines.push(`${key}=${value}`);
      } else if (operation === 'D') {
      } else if (operation === 'U') {
        updatedLines.push(`${key}=${value}`);
      }
    } else {
      updatedLines.push(line);
    }
  });

  if (operation === 'A' && !keyExists) {
    updatedLines.push(`${key}=${value}`);
  }

  fs.writeFileSync(absolutePath, updatedLines.join('\n'), 'utf-8');
}

function updatePropFileWithChanges(filePath, changes) {

  changes.keysToDelete.forEach(({ key }) => {
    updatePropFile(filePath, key, '', 'D');
  });

  changes.keysToUpdate.forEach(({ key, value }) => {
    updatePropFile(filePath, key, value, 'U');
  });

  changes.keysToAdd.forEach(({ key, value }) => {
    updatePropFile(filePath, key, value, 'A');
  });

}

async function handleGitDiff(diffOutput) {

  console.log(">>>>>>");
  console.log(diffOutput);
  console.log("<<<<<<"ß);



  const files = [];
  const fileDiffs = diffOutput.split(/diff --git a\//).slice(1);

  for (const fileDiff of fileDiffs) {
    const [filePathLine, ...diffLines] = fileDiff.split('\n');
    const filePath = filePathLine.split(' b/')[0].trim();

    const changes = {
      addedLines: [],
      removedLines: [],
      addedKeyValuePairs: new Map(),
      removedKeyValuePairs: new Map(),
      keysToDelete: [],
      keysToUpdate: [],
      keysToAdd: []
    };

    for (const line of diffLines) {

      if (line.trim().startsWith("#") || line.trim().startsWith("!")) {
        continue;
      }
      if (line.startsWith('+') && !line.startsWith('+++')) {
        const addedLine = line.slice(1).trim();
        changes.addedLines.push(addedLine);

        if (addedLine.includes('=') && addedLine.split('=').length === 2) {
          const [key, value] = addedLine.split('=').map(part => part.trim());
          if (key && value) {
            changes.addedKeyValuePairs.set(key, value);
          }
        }
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        const removedLine = line.slice(1).trim();
        changes.removedLines.push(removedLine);
        if (removedLine.includes('=') && removedLine.split('=').length === 2) {
          const [key, value] = removedLine.split('=').map(part => part.trim());
          if (key && value) {
            changes.removedKeyValuePairs.set(key, value);
          }
        }
      }
    }

    changes.removedKeyValuePairs.forEach((value, key) => {
      if (!changes.addedKeyValuePairs.has(key)) {
        changes.keysToDelete.push({
          key: key,
          value: ''
        });
      } else {
        changes.keysToUpdate.push({
          key: key,
          value: changes.addedKeyValuePairs.get(key)
        });
      }
    });

    changes.addedKeyValuePairs.forEach((value, key) => {
      if (!changes.removedKeyValuePairs.has(key)) {
        changes.keysToAdd.push({
          key: key,
          value: changes.addedKeyValuePairs.get(key)
        });
      }
    });

    files.push({ filePath, changes });
  }

  console.log(
    'Beautified Output:',
    JSON.stringify(
      files.map(file => ({
        ...file,
        changes: {
          ...file.changes,
          addedKeyValuePairs: mapToObject(file.changes.addedKeyValuePairs),
          removedKeyValuePairs: mapToObject(file.changes.removedKeyValuePairs),
        },
      })),
      null,
      2
    )
  );

  files.forEach(file => {
    updatePropFileWithChanges(String(file.filePath).replace("i18n.properties", "i18n_en.properties"), file.changes);
  });

}


(async function () {
  const diffOutput = process.env.DIFF
  await handleGitDiff(diffOutput)
})()