const fs = require('fs');
const path = require('path');

// Function to recursively find all JSX files in a directory
const findJsxFiles = (dir) => {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...findJsxFiles(fullPath));
    } else if (entry.name.endsWith('.jsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
};

// Function to fix a single JSX file
const fixJsxFile = (filePath) => {
  console.log(`Processing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Remove type imports
  content = content.replace(/import\s+{[^}]*}\s+from\s+['"]\.\.\/\.\.\/types['"];?/g, '');
  content = content.replace(/import\s+{[^}]*}\s+from\s+['"]\.\.\/types['"];?/g, '');
  
  // 2. Fix TypeScript generics in useParams, useState, etc.
  content = content.replace(/useParams<[^>]*>\(\)/g, 'useParams()');
  content = content.replace(/useState<[^>]*>\(/g, 'useState(');
  content = content.replace(/useRef<[^>]*>\(/g, 'useRef(');
  content = content.replace(/\.reduce<[^>]*>\(/g, '.reduce(');
  content = content.replace(/<([^<>]*?)>\s*=>\s*{/g, '=> {');
  
  // 3. Fix parameter type annotations
  content = content.replace(/\(\s*([a-zA-Z0-9_]+)\s*:\s*[a-zA-Z0-9_.<>|]+\s*\)/g, '($1)');
  content = content.replace(/\(\s*([a-zA-Z0-9_]+)\s*\|\s*[a-zA-Z0-9_.<>|]+>\s*\)/g, '($1)');
  content = content.replace(/\(\s*e\s*:\s*[a-zA-Z0-9_.]+\s*\)/g, '(e)');
  
  // 4. Fix function return type annotations
  content = content.replace(/\)\s*:\s*[a-zA-Z0-9_.<>|]+\s*=>/g, ') =>');
  
  // 5. Fix object property type annotations in destructuring
  content = content.replace(/{([^}:]+)}\s*=\s*useParams<{[^}]+}>\(\)/g, '{$1} = useParams()');
  
  // 6. Fix missing fragment brackets
  content = content.replace(/return\s*\(\s*\n\s*<Typography/g, 'return (\n        <>\n            <Typography');
  content = content.replace(/return\s*\(\s*\n\s*<Box/g, 'return (\n        <>\n            <Box');
  content = content.replace(/\n\s*<\/Paper>\s*\n\s*<\/Box>\s*\n\s*\);/g, '\n        </Paper>\n        </Box>\n        </>\n    );');
  
  // 7. Fix incomplete object property assignments
  content = content.replace(/\[\s*([a-zA-Z0-9_]+)\s*\],/g, '[$1]: value,');
  
  // 8. Fix missing values in style objects
  content = content.replace(/sx\s*=\s*{\s*{\s*([a-zA-Z0-9_]+)\s*}\s*}/g, 'sx={{ $1: 2 }}');
  content = content.replace(/sx\s*=\s*{\s*{\s*([a-zA-Z0-9_]+),/g, 'sx={{ $1: 2,');
  content = content.replace(/,\s*([a-zA-Z0-9_]+)\s*}/g, ', $1: 2 }');
  
  // 9. Fix property assignments with missing values
  content = content.replace(/(\w+)\s*\|\|\s*'',/g, '$1: data.$1 || \'\',');
  
  // 10. Fix missing JSX fragment brackets
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '{user ? (') {
      if (lines[i+1].trim() === '{user.user_type === \'provider\' ? (') {
        lines.splice(i+1, 0, '                            <>');
      }
    }
    
    if (lines[i].trim() === ') : (') {
      if (lines[i+1].trim().startsWith('<Button')) {
        lines.splice(i+1, 0, '                            <>');
      }
    }
  }
  content = lines.join('\n');
  
  // Write the fixed content back to the file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
};

// Create the types directory and empty index.js file
const typesDir = path.join(__dirname, '..', 'frontend', 'src', 'types');
if (!fs.existsSync(typesDir)) {
  fs.mkdirSync(typesDir, { recursive: true });
}

const typesIndexContent = `// Empty types for backward compatibility
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
`;

fs.writeFileSync(path.join(typesDir, 'index.js'), typesIndexContent);
console.log('Created empty types/index.js for backward compatibility');

// Get all JSX files in the components directory
const componentsDir = path.join(__dirname, '..', 'frontend', 'src', 'components');
const jsxFiles = findJsxFiles(componentsDir);

// Process each JSX file
for (const file of jsxFiles) {
  fixJsxFile(file);
}

console.log('All files processed successfully!'); 