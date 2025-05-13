const fs = require('fs');
const path = require('path');

/**
 * This script fixes the broken import declarations in JSX files 
 * specifically targeting the issues with named imports like:
 * import React, { useState, useEffect: 2: 2 } from 'react';
 */

const fixJSXFile = (filePath) => {
  console.log(`Processing ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix patterns like "import React, { useState: 2: 2 } from 'react'"
  content = content.replace(/import\s+React,\s*{([^}]+)}\s+from\s+['"]react['"];?/g, (match, importList) => {
    // Fix each import item like "useState: 2: 2" to just "useState"
    const fixedImports = importList.replace(/(\w+)(?:\s*:\s*\d+\s*:\s*\d+|\s*:\s*\d+|\s*:\s*value)/g, '$1');
    return `import React, { ${fixedImports} } from 'react';`;
  });
  
  // Fix patterns like "import { useNavigate: 2 } from 'react-router-dom'"
  content = content.replace(/import\s+{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"];?/g, (match, importList, source) => {
    // Fix each import item like "useNavigate: 2" to just "useNavigate"
    const fixedImports = importList.replace(/(\w+)(?:\s*:\s*\d+\s*:\s*\d+|\s*:\s*\d+|\s*:\s*value)/g, '$1');
    return `import { ${fixedImports} } from '${source}';`;
  });
  
  // Write the fixed content back
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
};

const findJSXFiles = (dir) => {
  const files = fs.readdirSync(dir);
  const jsxFiles = [];
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      jsxFiles.push(...findJSXFiles(filePath));
    } else if (file.endsWith('.jsx')) {
      jsxFiles.push(filePath);
    }
  }
  
  return jsxFiles;
};

// Process all JSX files in the components directory
const componentsDir = path.join(__dirname, '..', 'frontend', 'src', 'components');
const jsxFiles = findJSXFiles(componentsDir);

console.log(`Found ${jsxFiles.length} JSX files to process`);

for (const file of jsxFiles) {
  fixJSXFile(file);
}

console.log('All JSX files processed successfully!'); 