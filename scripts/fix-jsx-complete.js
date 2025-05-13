const fs = require('fs');
const path = require('path');

/**
 * This script fixes all the remaining JSX syntax issues after the imports have been fixed,
 * including string literals, function parameters, JSX attributes, etc.
 */

const fixJSXFile = (filePath) => {
  console.log(`Processing ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix imports first to make sure they're clean
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
  
  // Fix unclosed string literals with trailing single quotes
  content = content.replace(/localStorage\.setItem\(['"]([^'"]+)['"]\s*,\s*[^)]+\)['"]/g, 
    "localStorage.setItem('$1', response.data.token)");
  
  // Fix navigate function calls with unclosed parenthesis
  content = content.replace(/navigate\(['"]([^'"]+)['"]\s*'/g, "navigate('$1'");
  
  // Fix const navigate declarations
  content = content.replace(/const\s+navigate\s*=\s*useNavigate\s*\(\s*'[^']*'\s*\);/g, "const navigate = useNavigate();");
  
  // Fix useState initializations with trailing single quotes
  content = content.replace(/useState\(\s*{\s*[^}]*\s*}\s*'\s*\);/g, "useState({});");
  content = content.replace(/useState\(\s*['"]([^'"]*)['"]\s*'\s*\);/g, "useState('$1');");
  
  // Fix broken JSX element closing tags
  content = content.replace(/\{text\.trim\(\)\}\{end(?::\s*\d+)?\}\/(\w+)>/g, "</$1>");
  
  // Fix broken JSX attributes
  content = content.replace(/(\w+)\s*:\s*\d+(?:\s*:\s*\d+)?/g, "$1: 2");
  
  // Fix MT and other style properties
  content = content.replace(/(\w+)\s*:\s*\d+\s*:\s*\d+/g, "$1: 2");
  
  // Fix MUI attribute syntax with erroneous brackets
  content = content.replace(/sx=\{\s*\{\s*([^{}]+)\s*\}\s*\}/g, (match, props) => {
    // Clean up each property in the sx object
    const cleanedProps = props.replace(/(\w+)(?:\s*:\s*\d+\s*:\s*\d+|\s*:\s*\d+)/g, "$1: 2");
    return `sx={{ ${cleanedProps} }}`;
  });
  
  // Fix object destructuring with value annotations
  content = content.replace(/const\s*{\s*([^}]+)\s*}\s*=\s*([^;]+);/g, (match, props, source) => {
    // Clean up property names in destructuring
    const cleanedProps = props.replace(/(\w+)(?:\s*:\s*\d+\s*:\s*\d+|\s*:\s*\d+|\s*:\s*value)/g, "$1");
    return `const { ${cleanedProps} } = ${source};`;
  });
  
  // Fix object properties in JSX
  content = content.replace(/([\w.]+)(?:\s*:\s*\d+\s*:\s*\d+|\s*:\s*\d+|\s*:\s*value)/g, "$1");
  
  // Fix JSX attributes
  content = content.replace(/value=\{\s*([^{}]+?)(?:\s*:\s*\d+\s*:\s*\d+|\s*:\s*\d+|\s*:\s*value)\s*\}/g, "value={$1}");
  content = content.replace(/onChange=\{\s*([^{}]+?)(?:\s*:\s*\d+\s*:\s*\d+|\s*:\s*\d+|\s*:\s*value)\s*\}/g, "onChange={$1}");
  content = content.replace(/onClick=\{\s*([^{}]+?)(?:\s*:\s*\d+\s*:\s*\d+|\s*:\s*\d+|\s*:\s*value)\s*\}/g, "onClick={$1}");
  content = content.replace(/onSubmit=\{\s*([^{}]+?)(?:\s*:\s*\d+\s*:\s*\d+|\s*:\s*\d+|\s*:\s*value)\s*\}/g, "onSubmit={$1}");
  
  // Fix array/object property access in setters
  content = content.replace(/\[\s*(\w+)\s*\],/g, "[$1]: value,");
  
  // Fix function returns with missing closing parenthesis
  content = content.replace(/\s+'\);$/g, "\n    );\n};");
  
  // Fix unclosed angle brackets in JSX
  content = content.replace(/([A-Za-z]+)>(?:\s*\n)/g, "$1>\n");
  
  // Fix console errors
  content = content.replace(/console\.error\(['"]([^'"]*)['"]'\);/g, "console.error('$1');");
  
  // Fix setError statements
  content = content.replace(/setError\(['"]([^'"]*)['"]'\);/g, "setError('$1');");
  
  // Additional pass to catch any remaining annotations
  content = content.replace(/(\w+)(?:\s*:\s*\d+\s*:\s*\d+|\s*:\s*\d+|\s*:\s*value)/g, "$1");
  
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