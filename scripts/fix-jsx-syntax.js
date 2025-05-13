const fs = require('fs');
const path = require('path');

/**
 * This script fixes common JSX syntax issues after TypeScript to JavaScript conversion
 */

const fixJSXFile = (filePath) => {
  console.log(`Processing ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Fix import declarations
  // Fix import React: value
  content = content.replace(/import\s+React:\s+value,/g, 'import React,');
  
  // Fix basic import with single values
  content = content.replace(/(import\s+\w+)\s*:\s*value\s*(from\s+['"][^'"]+['"];?)/g, '$1 $2');
  
  // Fix import { ... } with type annotations
  content = content.replace(/import\s+{([^}]+)}\s+from\s+(['"][^'"]+['"];?)/g, (match, importList, source) => {
    const fixedImports = importList.replace(/(\w+)\s*:\s*value/g, '$1');
    return `import { ${fixedImports} } from ${source}`;
  });
  
  // Fix remaining imports with weird annotations
  content = content.replace(/import\s+{([^}]+)}\s+from\s+(['"][^'"]+['"];?)/g, (match, importList, source) => {
    const fixedImports = importList.replace(/(\w+)\s*:\s*\d+/g, '$1');
    return `import { ${fixedImports} } from ${source}`;
  });
  
  // 2. Fix useState declarations
  content = content.replace(/const\s+\[\s*(\w+)\s*:\s*value\s*,\s*set(\w+)\s*\]\s*=\s*useState/g, 
    (match, stateName, setterSuffix) => `const [${stateName}, set${setterSuffix}] = useState`);
  
  // 3. Fix type annotations in function params/variables
  content = content.replace(/(\w+)\s*:\s*value([,)])/g, '$1$2');
  content = content.replace(/(\w+)\s*:\s*value\s*=\s*/g, '$1 = ');
  
  // 4. Fix missing JSX closing tags and fragments
  content = content.replace(/<>\s*\n/g, '<>\n');
  content = content.replace(/\n\s*<\/>/g, '\n</>');
  
  // 5. Fix broken object destructuring
  content = content.replace(/const\s+{\s*([^}]+)}\s*=\s*([^;]+);/g, (match, props, source) => {
    const fixedProps = props.replace(/(\w+)\s*:\s*value/g, '$1');
    return `const { ${fixedProps} } = ${source};`;
  });
  
  // 6. Fix broken JSX attributes
  content = content.replace(/(\w+):\s*2:/g, '$1:');
  content = content.replace(/(\w+):\s*\d+:\s*value/g, '$1: $2');
  
  // 7. Fix object shorthand syntax
  content = content.replace(/(\w+):\s*\1/g, '$1');
  
  // 8. Fix broken Date instantiation
  content = content.replace(/start\s+Date/g, 'start: new Date');
  content = content.replace(/end\s+Date/g, 'end: new Date');
  
  // 9. Fix incomplete object property values
  content = content.replace(/(\w+):\s*value,/g, '$1,');
  content = content.replace(/(\w+):\s*value\s*}/g, '$1 }');
  
  // 10. Fix console statements
  content = content.replace(/console\.error\(\s*['"]([^'"]*?)(?:\);)/g, "console.error('$1');");
  content = content.replace(/console\.log\(\s*['"]([^'"]*?)(?:\);)/g, "console.log('$1');");
  
  // 11. Fix setup: 2 to setup
  content = content.replace(/setup:\s*2/g, 'setup');
  
  // 12. Fix missing object initializers
  content = content.replace(/(\w+)(\s*}+)(?!\s*[:,;])/g, (match, prop, closing) => {
    if (match.includes(':')) return match;
    return `${prop}: 2${closing}`;
  });
  
  // 13. Fix special property access patterns
  content = content.replace(/(\w+)\.(\w+):\s*value/g, '$1.$2');
  
  // 14. Fix incorrect JSX boolean attributes
  content = content.replace(/(\w+):\s*true:\s*value/g, '$1={true}');
  
  // 15. Fix broken array/object lookups
  content = content.replace(/\[\s*(\w+)\s*\],/g, '[$1]: value,');
  
  // 16. Fix flex property
  content = content.replace(/flex: 2,/g, 'flex: 1,');
  content = content.replace(/display: 'flex: 2'/g, "display: 'flex'");
  
  // 17. Fix broken jsx fragments
  content = content.replace(/<\s*\/\s*>(?!\s*[),;])/g, '</>');
  
  // 18. Clean up broken if statements in jsx
  content = content.replace(/if\s*\(.*?\)\s*{(.*?)}(?:\s*else\s*{\s*})?/gs, (match) => {
    return match.replace(/:\s*value/g, '');
  });
  
  // 19. Fix property objects with missing values
  content = content.replace(/([a-zA-Z]+):\s*[a-zA-Z.]+:\s*value/g, '$1: $2');
  
  // 20. Fix useEffect content
  content = content.replace(/useEffect\(\s*\(\)\s*=>\s*{(.*?)}\s*,\s*\[(.*?)]\s*\)/gs, (match, body, deps) => {
    return match.replace(/:\s*value/g, '');
  });
  
  // 21. Fix broken string literals in JSX
  content = content.replace(/'([^']*?)(?:\);)/g, "'$1');");
  
  // 22. Fix broken JSX syntax for array maps
  content = content.replace(/(\w+)\.map:\s*2\s*\(/g, '$1.map(');
  
  // 23. Fix broken arrow functions
  content = content.replace(/{\s*await\s+/g, 'async () => { await ');
  
  // 24. Fix incomplete strings
  content = content.replace(/(\w+)\s*===\s*['"]([^'"]*?)(?:[),])/g, "$1 === '$2')");
  
  // Final cleanup - remove stray ": value" annotations
  content = content.replace(/:\s*value(?=\s*[,)\]}])/g, '');
  
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

for (const file of jsxFiles) {
  fixJSXFile(file);
}

console.log('All JSX files processed successfully!'); 