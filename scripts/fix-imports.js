const fs = require('fs');
const path = require('path');

/**
 * This script fixes import declarations in JSX files by removing the ': value' annotations
 * that were incorrectly added during TypeScript to JavaScript conversion
 */

const fixJSXFile = (filePath) => {
  console.log(`Processing ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix import React: value
  content = content.replace(/import\s+React:\s+value,/g, 'import React,');
  
  // Fix import { useState: value, useEffect } style patterns
  content = content.replace(/{\s*([^}]*?)}/g, (match, importList) => {
    // Replace each ': value' occurrence within curly braces
    const fixedImports = importList.replace(/(\w+):\s*value/g, '$1');
    return `{ ${fixedImports} }`;
  });
  
  // Fix remaining type annotations in function parameters and object destructuring
  content = content.replace(/(\w+):\s*value([,)])/g, '$1$2');
  
  // Fix incomplete string literals in console messages
  content = content.replace(/console\.error\(\s*'([^']*?)(?:\);)/g, "console.error('$1');");
  content = content.replace(/console\.log\(\s*'([^']*?)(?:\);)/g, "console.log('$1');");
  
  // Fix 'setup: 2' to just 'setup'
  content = content.replace(/setup:\s*2/g, 'setup');
  
  // Fix sx={{ mt: 2: value }} style patterns
  content = content.replace(/(\w+):\s*(\d+):\s*value/g, '$1: $2');
  
  // Fix missing values in style objects like mt }}
  content = content.replace(/(\w+)(\s*}+)/g, (match, prop, closing) => {
    // Don't replace if it's already a proper assignment
    if (match.includes(':')) return match;
    return `${prop}: 2${closing}`;
  });
  
  // Fix broken start Date and end Date patterns
  content = content.replace(/start\s+Date/g, 'start: new Date');
  content = content.replace(/end\s+Date/g, 'end: new Date');
  
  // Fix broken JSX fragments
  content = content.replace(/<\/>(?!\s*[),;])/g, '</>\n');
  
  // Fix incorrect id assignments
  content = content.replace(/id\s*\|\|\s*`/g, 'id: id || `');
  
  // Fix incorrect value assignments in object initialization
  content = content.replace(/id:\s*value,/g, 'id,');
  
  // Fix broken object literals with missing start/end properties
  content = content.replace(/{\s*start:\s*value\s*,\s*end\s*}/g, '{ start, end }');
  
  // Fix incorrect date references
  content = content.replace(/appointmentDate\s*===\s*dateStr\s*}/g, 'appointmentDate === dateStr });');
  
  // Fix missing JSX quotes
  content = content.replace(/>([^<{}\n]*?)(\{|<|$)/g, (match, text, end) => {
    // Don't touch empty strings or already proper text
    if (text.trim() === '' || /^[\s"'0-9]+$/.test(text.trim())) return match;
    
    // If it looks like text that should be quoted
    if (/[a-zA-Z]/.test(text.trim())) {
      return `>{text.trim()}{end}`;
    }
    
    return match;
  });
  
  // Fix broken colorSet references
  content = content.replace(/backgroundColor:\s*value,/g, 'backgroundColor: colorSet.bg,');
  content = content.replace(/color:\s*value,/g, 'color: colorSet.text,');
  
  // Fix broken flex properties
  content = content.replace(/flex,/g, 'flex: 1,');
  content = content.replace(/display: 'flex: 2'/g, "display: 'flex'");
  
  // Fix broken JSX height references
  content = content.replace(/height: 2,/g, 'height: 20,');
  
  // Fix broken JSX border references
  content = content.replace(/borderBottom: value,/g, "borderBottom: '1px solid #ddd',");
  
  // Fix broken expressions like startTime: value
  content = content.replace(/startTime:\s*value/g, 'startTime');
  content = content.replace(/endTime:\s*value/g, 'endTime');
  
  // Fix broken object access like new Date(appointment.start_time: value)
  content = content.replace(/([a-zA-Z]+)\.([a-zA-Z_]+):\s*value/g, '$1.$2');
  
  // Fix missing Object.entries() value parameter
  content = content.replace(/Object\.entries\(([^)]*?)\)/g, 'Object.entries($1)');
  
  // Fix Date instances
  content = content.replace(/new Date\(([^)]*?)\):\s*value/g, 'new Date($1)');
  
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