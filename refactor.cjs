const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'src');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk(dirPath);

files.forEach(filePath => {
  if (filePath.includes('api.ts') || filePath.includes('AuthContext.tsx') || filePath.includes('Login.tsx') || filePath.includes('Register.tsx')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (content.includes('localStorage.getItem(\'gcg_token\')') || content.match(/fetch\(.*?\{/)) {
    // Determine relative path to src/utils/api
    const depth = filePath.split(path.sep).length - dirPath.split(path.sep).length;
    let importPath = '../'.repeat(Math.max(0, depth - 1)) + 'utils/api';
    if(depth === 1) importPath = './utils/api';

    if(!content.includes('fetchApi')) {
       // Insert import at top
       content = content.replace(/(import .*?;[\r\n]+)/, `$1import { fetchApi } from '${importPath}';\n`);
    }

    // Remove token getters
    content = content.replace(/const token = localStorage\.getItem\('gcg_token'\);\s*/g, '');
    
    // Replace API_URL fetch with fetchApi
    content = content.replace(/fetch\(`\$\{API_URL\}(.*?)`\s*,\s*\{(.*?)\}\)/gs, (match, endpoint, options) => {
        let newOptions = options.replace(/'Authorization':\s*`Bearer \$\{token\}`\s*,?/g, '');
        newOptions = newOptions.replace(/'Accept':\s*'application\/json'\s*,?/g, '');
        
        // Clean up empty headers
        newOptions = newOptions.replace(/headers:\s*\{\s*\}[\s,]*/g, '');
        newOptions = newOptions.replace(/headers:\s*\{\s*,\s*/g, 'headers: { ');
        newOptions = newOptions.replace(/,\s*\}/g, ' }');

        return `fetchApi('${endpoint}', {${newOptions}})`;
    });

    content = content.replace(/fetch\(`\$\{API_URL\}(.*?)`\)/gs, "fetchApi('$1')");

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${path.basename(filePath)}`);
  }
});

console.log('Refactoring complete.');
