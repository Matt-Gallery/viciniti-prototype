const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * This script fixes various syntax issues in JSX files after TypeScript to JavaScript conversion
 */

// Helper functions
const fixJSXFile = (filePath) => {
  console.log(`Processing ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Fix import statements
  content = content.replace(/import\s+React,\s*{\s*([^}]+)}\s+from\s+['"]react['"];?/g, (match, importList) => {
    // Remove any ': value' or ': 2' type annotations
    const fixedImports = importList.replace(/(\w+)(?:\s*:\s*(?:value|2(?:\s*:\s*2)?))(?:,|$)/g, '$1,');
    return `import React, { ${fixedImports} } from 'react';`;
  });

  // 2. Fix other imports with type annotations
  content = content.replace(/import\s+{\s*([^}]+)}\s+from\s+(['"][^'"]+['"])/g, (match, importList, source) => {
    // Remove any ': value' or ': 2' type annotations
    const fixedImports = importList.replace(/(\w+)(?:\s*:\s*(?:value|2(?:\s*:\s*2)?))(?:,|$)/g, '$1,');
    return `import { ${fixedImports} } from ${source}`;
  });

  // 3. Fix import declarations with single values
  content = content.replace(/import\s+(\w+)\s*:\s*(?:value|2(?:\s*:\s*2)?)\s*from\s+(['"][^'"]+['"])/g, 'import $1 from $2');

  // 4. Fix useNavigate calls with unterminated string
  content = content.replace(/useNavigate\s*\(['"]?(?:\);?)?/g, 'useNavigate();');

  // 5. Fix useParams calls with unterminated string
  content = content.replace(/useParams\s*\(['"]?(?:\);?)?/g, 'useParams();');

  // 6. Fix unterminated string literals (single and double quotes)
  content = content.replace(/(['"])([^'"]*?)(['"])?;/g, (match, open, text, close) => {
    if (close) return match; // Already terminated correctly
    return `${open}${text}${open};`;
  });

  // 7. Fix the broken object property assignments in JSX style attributes
  content = content.replace(/sx\s*=\s*{\s*{\s*([^}]*?)}\s*}/g, (match, props) => {
    // Process style properties without values and add missing values
    const fixedProps = props.replace(/(\w+)(?:\s*,|\s*}|$)/g, '$1: 2,')
                          .replace(/mt\s*:/g, 'mt: 2')
                          .replace(/mb\s*:/g, 'mb: 2')
                          .replace(/ml\s*:/g, 'ml: 2')
                          .replace(/mr\s*:/g, 'mr: 2')
                          .replace(/pt\s*:/g, 'pt: 2')
                          .replace(/pb\s*:/g, 'pb: 2')
                          .replace(/pl\s*:/g, 'pl: 2')
                          .replace(/pr\s*:/g, 'pr: 2')
                          .replace(/p\s*:/g, 'p: 2')
                          .replace(/gap\s*:/g, 'gap: 2')
                          .replace(/zIndex\s*:/g, 'zIndex: 100')
                          .replace(/fontSize\s*:/g, 'fontSize: 16')
                          .replace(/borderRadius\s*:/g, 'borderRadius: 4')
                          .replace(/flex\s*:/g, 'flex: 1')
                          .replace(/flexShrink\s*:/g, 'flexShrink: 0')
                          .replace(/top\s*:/g, 'top: 0')
                          .replace(/left\s*:/g, 'left: 0');
    
    return `sx={{ ${fixedProps} }}`;
  });

  // 8. Fix empty object initialization with spaces
  content = content.replace(/{\s*}/g, '{}');

  // 9. Fix component tag opening and closing issues
  // Fix missing InputLabel closing tag
  content = content.replace(/([A-Za-z]+)<\/InputLabel>/g, '$1</InputLabel>');

  // 10. Fix nested JSX in InputProps
  content = content.replace(/startAdornment\s+position="start">(.*?)<\/InputAdornment>/g, 'startAdornment: <InputAdornment position="start">$1</InputAdornment>');

  // 11. Fix missing CardContent closing tags
  content = content.replace(/<CardContent>([\s\S]*?)(?=<\/Card>)/g, '<CardContent>$1</CardContent>');

  // 12. Fix broken Box components
  content = content.replace(/<\/Box>\s*<\/Box>\s*<\/Box>\s*<\/form>/g, '</Box></form>');

  // 13. Fix missing Box closing tags
  content = content.replace(/<Box([^>]*)>([\s\S]*?)(?=<Box|<\/form>)/g, (match, attrs, content) => {
    if (!match.includes('</Box>')) {
      return `<Box${attrs}>${content}</Box>`;
    }
    return match;
  });

  // 14. Fix arrow function component declarations
  content = content.replace(/const\s+(\w+)\s*=\s*\(\s*\)\s*=>\s*{\s*const/g, 'const $1 = () => {\n  const');

  // 15. Fix broken component returns
  content = content.replace(/\);$/g, ');');

  // 16. Fix || in object property assignments with proper colon
  content = content.replace(/(id)\s*\|\|\s*`([^`]+)`/g, '$1: `$2`');

  // 17. Fix broken setState calls
  content = content.replace(/setState\(prev\s*=>\s*\(\{\s*\.\.\.prev,\s*([^}]+)(?:\s*}\)\)?;)/g, (match, props) => {
    // Fix missing values in setState object properties
    const fixedProps = props.replace(/(\w+)(?:\s*,|\s*$)/g, '$1: true,')
                           .replace(/loading,/g, 'loading: false,')
                           .replace(/error,/g, 'error: "",')
                           .replace(/editMode,/g, 'editMode: true,')
                           .replace(/exists,/g, 'exists: true,')
                           .replace(/activeTab,/g, 'activeTab: 0,');
    
    return `setState(prev => ({ ...prev, ${fixedProps} }));`;
  });

  // 18. Fix localStorage.setItem with incorrect closing parenthesis
  content = content.replace(/localStorage\.setItem\('user',\s*response\.data\.token\)\)/g, "localStorage.setItem('user', JSON.stringify(updatedUser))");

  // 19. Fix unterminated JSX component returns 
  content = content.replace(/\s*'\);(\s*\n\s*\};)/g, '\n    );\n$1');

  // 20. Fix missing comma in object property assignments
  content = content.replace(/\[name\]\s*,/g, '[name]: value,');
  content = content.replace(/\[name\]\s*}/g, '[name]: value }');

  // 21. Fix missing value in updatedUser
  content = content.replace(/\.\.\.\s*userData,\s*\.\.\.\s*data\s*/g, '...userData, ...data');

  // 22. Fix 'text.trim()' and 'end' text in the code
  content = content.replace(/>{text\.trim\(\)}{end}/g, ' > endTime');

  // Save the file if there were changes
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed syntax issues in ${filePath}`);
    return true;
  } else {
    console.log(`No changes made to ${filePath}`);
    return false;
  }
};

// Main function to find and process JSX files
const main = () => {
  const jsxFiles = glob.sync('frontend/src/components/**/*.jsx');
  
  console.log(`Found ${jsxFiles.length} JSX files to process`);
  
  let fixedCount = 0;
  for (const file of jsxFiles) {
    try {
      const wasFixed = fixJSXFile(file);
      if (wasFixed) fixedCount++;
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  console.log(`\nCompleted processing. Fixed ${fixedCount} files.`);
};

// Run the script
main(); 