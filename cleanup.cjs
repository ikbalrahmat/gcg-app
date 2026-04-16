const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'src');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk(dirPath);

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const originalContent = content;
  
  // Clean lingering token in Authorization headers
  content = content.replace(/['"]?Authorization['"]?\s*:\s*`Bearer \$\{token\}`\s*,?/g, '');
  content = content.replace(/'Authorization'\s*:\s*`Bearer `\s*\+\s*token\s*,?/g, '');
  content = content.replace(/`Bearer \$\{token\}`/g, '""');

  if(content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Cleaned up ${path.basename(filePath)}`);
  }
});
