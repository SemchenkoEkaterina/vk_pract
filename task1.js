const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// read file .stylelintignore
const filePath = '../.stylelintignore';
const directoryPath = path.join(__dirname,  '../', 'src');

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.log(`Error reading file: ${filePath}`, err);
    return '';
  }
}

function rewriteFile (filePath, content) {
    fs.writeFile(filePath, content, (err) => {
        if (err) {
          console.error(`Error writing file: ${err}`);
        } else {
          console.log(`File ${filePath} has been rewritten with content: ${content}.`);
        }
    }); 
}

function findCssFiles(directory, filePattern) {
  const files = fs.readdirSync(directory);
  const cssFiles = [];

  files.forEach(file => {
    const filePath = path.join(directory, file);

    if (fs.statSync(filePath).isDirectory()) {
      cssFiles.push(...findCssFiles(filePath, filePattern));
    } else if (file.endsWith('.css')) {
      const fileContent = readFile(filePath);
      if (fileContent.includes('/* stylelint-disable */')) {
        cssFiles.push(filePath);
      }
    }
  });

  return cssFiles;
}


const fileData = fs.readFileSync(filePath, 'utf-8');
rewriteFile(filePath, '');

// split file into lines and put each line in an array
const ignoreList = fileData.split(/\r?\n/);

const cssFiles = findCssFiles(directoryPath, /\.css$/).map(el => el.slice(directoryPath.length - 'src'.length, el.length));
const filteredIgnoreList = ignoreList.filter(file => !cssFiles.includes(file));

console.log('running stylelint fo every file in eslintignore...');
filteredIgnoreList.forEach(file => {
    exec(`npx stylelint "${file}"`, { cwd: '../' }, (error) => {
      if (error && !error.message.includes('No files matching the pattern')) {
        fs.appendFileSync(filePath, `${file}\n`);
      }
    });
});