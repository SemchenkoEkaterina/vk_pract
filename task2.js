const fs = require('fs');
const path = require('path');
const ignore = require('ignore');
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
        cssFiles.push(filePath);
      }
    });
  
    return cssFiles;
  }

function findCssFilesWihtStylelintDisable(directory, filePattern) {
    const files = fs.readdirSync(directory);
    const _cssFiles = [];
  
    files.forEach(file => {
      const filePath = path.join(directory, file);
  
      if (fs.statSync(filePath).isDirectory()) {
        _cssFiles.push(...findCssFilesWihtStylelintDisable(filePath, filePattern));
      } else if (file.endsWith('.css')) {
        const fileContent = readFile(filePath);
        if (fileContent.includes('/* stylelint-disable */')) {
          _cssFiles.push(filePath);
        }
      }
    });
  
    return _cssFiles;
}

  

const fileData = fs.readFileSync(filePath, 'utf-8');
rewriteFile(filePath, '');

const cssFiles = findCssFiles(directoryPath, /\.css$/).map(el => el.slice(directoryPath.length - 'src'.length, el.length));
const cssFilesWithDisabledStylelint = findCssFilesWihtStylelintDisable(directoryPath, /\.css$/).map(el => el.slice(directoryPath.length - 'src'.length, el.length));
  
// split file into lines and put each line in an array
const ignoreList = fileData.split(/\r?\n/);

const ig = ignore().add(ignoreList);
// use only files mentioned in stylelintignore
// remove files which already disabled in file
const filteredCssFiles = cssFiles.filter(file => ig.ignores(file)).filter(file => !cssFilesWithDisabledStylelint.includes(file));

const regex =  /(\d+):\d+ .* ([a-zA-Z\-]+)$/;

filteredCssFiles.forEach(file => {
    exec(`npx stylelint "../${file}"`, (error, stdin, stdout) => {
      if (error && !error.message.includes('No files matching the pattern')) {
        const result = stdin.split(/\n/);
        const storageOfErrorsByLines = {};
        result.map(line => {
            const result = line.match(regex);
            if (!result) return;
            let [_, lineNumber, type] = result;
            lineNumber = parseInt(lineNumber);
            if (!storageOfErrorsByLines[lineNumber]) {
                storageOfErrorsByLines[lineNumber] = [type]
            } else if (!storageOfErrorsByLines[lineNumber].includes(type)) {
                storageOfErrorsByLines[lineNumber].push(type);
            }
        });
        
        fs.readFile(path.join(__dirname,  '../', file), 'utf8', (err, data) => {
            if (err) throw err;
          
            const lines = data.split('\n');
          
            Object.entries(storageOfErrorsByLines).forEach(([lineNumber, lineToInsert], i) => {
              lines.splice(lineNumber - 1 + i, 0, `/* stylelint-disable-next-line ${lineToInsert.join(', ')} */`);
            });
          
            const updatedData = lines.join('\n');
            console.log(updatedData);
          
            fs.writeFile(path.join(__dirname,  '../', file), updatedData, 'utf8', (err) => {
              if (err) throw err;
              console.log('File updated successfully.');
            });
        });  
      }
    });
});