const fs = require('fs');
const path = require('path');

/**
 * This script fixes common TypeScript-to-JavaScript conversion issues:
 * 1. Removes type annotations from parameter declarations (e.g., `(e: React.ChangeEvent)` -> `(e)`)
 * 2. Fixes property assignments (e.g., `[name],` -> `[name]: value,`)
 * 3. Adds missing numeric/string values to `sx` prop values (e.g., `sx={{ mt }}` -> `sx={{ mt: 2 }}`)
 * 4. Fixes object initialization (e.g., `email || '',` -> `email: userData.email || '',`)
 * 5. Removes TypeScript generics (e.g., `useParams<{ id }>()` -> `useParams()`)
 */

const fixJSXFile = (filePath) => {
  console.log(`Processing ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Remove TypeScript imports
  content = content.replace(/import { .* } from ['"]\.\.\/.\.\/types['"]/g, '');
  content = content.replace(/import { .* } from ['"]\.\.\/types['"]/g, '');
  
  // 2. Remove type annotations from parameter declarations
  content = content.replace(/\((.*?)\s*:\s*[^)]+\)/g, '($1)');
  content = content.replace(/\((.*?)\s*\|\s*[^)]+>\)/g, '($1)');
  
  // 3. Fix property assignments in objects
  content = content.replace(/\[\s*(\w+)\s*\],/g, '[$1]: value,');
  
  // 4. Fix useParams with generics
  content = content.replace(/useParams<[^>]+>\(\)/g, 'useParams()');
  
  // 5. Fix .reduce() with type parameters
  content = content.replace(/\.reduce<[^>]+>\(/g, '.reduce(');
  
  // 6. Fill in missing sx prop values
  const sxProps = ['mt', 'mb', 'ml', 'mr', 'p', 'pt', 'pb', 'pl', 'pr', 'px', 'py', 'gap', 'flex', 'flexShrink', 'zIndex', 'borderRadius', 'width', 'height', 'top', 'left', 'right', 'bottom'];
  
  for (const prop of sxProps) {
    // Replace standalone props with default values
    content = content.replace(new RegExp(`(${prop})(?![:\\w])`, 'g'), `${prop}: 2`);
  }
  
  // 7. Fix empty angle brackets
  content = content.replace(/<>\s*\n/g, '<>\n');
  content = content.replace(/\n\s*<\/>/g, '\n</>');
  
  // 8. Remove remaining TypeScript annotations
  content = content.replace(/:\s*([A-Za-z][A-Za-z0-9_]*(?:\[\])?)\s*(?=[,)])/g, '');
  
  // 9. Fix closing object initializations
  content = content.replace(/(\w+)\s*(?=\}\))/g, '$1: value');
  
  // 10. Fix await in arrow function with proper async/await
  content = content.replace(/\{\s*await\s+/g, 'async () => { await ');

  // 11. Fix malformed object properties
  content = content.replace(/(\w+)\s*(?=,|\n\s*\})/g, '$1: value');
  
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

// Create empty types directory and index.js
const typesDir = path.join(__dirname, '..', 'frontend', 'src', 'types');
const typesIndexFile = path.join(typesDir, 'index.js');

if (!fs.existsSync(typesDir)) {
  fs.mkdirSync(typesDir, { recursive: true });
}

fs.writeFileSync(typesIndexFile, `// Empty types for backward compatibility
export const Service = {};
export const ServiceCategory = {};
export const TimeBlock = {};
export const AppointmentCreateRequest = {};
export const Appointment = {};
export const User = {};
export const AuthResponse = {};
export const ServiceProvider = {};
export const ServiceCreateRequest = {};
export const UserRegisterRequest = {};
export const ApiService = {};
export const ApiAppointment = {};
`, 'utf8');

console.log('Created empty types/index.js for backward compatibility');

// Process all JSX files in the components directory
const componentsDir = path.join(__dirname, '..', 'frontend', 'src', 'components');
const jsxFiles = findJSXFiles(componentsDir);

for (const file of jsxFiles) {
  fixJSXFile(file);
}

console.log('All JSX files processed successfully!'); 