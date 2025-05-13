const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * This script fixes comprehensive JSX syntax issues across all JSX files
 * - Fixes import declarations with TypeScript annotations
 * - Fixes component props with extra whitespace
 * - Fixes unterminated string literals
 * - Adds missing values for common MUI props (like sx={{mb}} -> sx={{mb: 2}})
 * - Fixes template literals and braces in JSX
 */

// Common MUI props that need values
const COMMON_PROPS = ['mt', 'mb', 'ml', 'mr', 'p', 'px', 'py', 'pt', 'pb', 'pl', 'pr', 'height', 'width', 'maxWidth', 'minWidth', 'zIndex', 'fontSize', 'flex', 'flexGrow', 'flexShrink', 'top', 'bottom', 'left', 'right'];

const fixJSXFile = (filePath) => {
  console.log(`Processing ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Fix import statements
  // Fix import React: value
  content = content.replace(/import\s+React:\s+value,/g, 'import React,');
  
  // Fix import { useState: value, useEffect } patterns
  content = content.replace(/import\s+{([^}]+)}\s+from\s+(['"][^'"]+['"];?)/g, (match, importList, source) => {
    // Replace ': value' or ': 2: 2' annotations
    const fixedImports = importList.replace(/(\w+)(?:\s*:\s*(?:value|(?:\d+\s*:\s*\d+)))/g, '$1');
    return `import {${fixedImports}} from ${source}`;
  });
  
  // 2. Fix JSX attributes with extra whitespace
  content = content.replace(/([a-zA-Z0-9_]+)\s*=\s*{\s*([^{}]+?)\s*}/g, (match, attr, value) => {
    return `${attr}={${value.trim()}}`;
  });
  
  // 3. Fix unterminated string literals
  content = content.replace(/(['"])([^'"]*?)\(/g, (match, quote, text) => {
    // If this looks like an unterminated string with an opening parenthesis, fix it
    return `${quote}${text})${quote}`;
  });
  
  // 4. Add missing values for common MUI props
  COMMON_PROPS.forEach(prop => {
    // Replace standalone prop in sx object: sx={{ mb }} -> sx={{ mb: 2 }}
    content = content.replace(new RegExp(`(sx\\s*=\\s*{\\s*{[^}]*?)\\b${prop}\\b(?!\\s*:)([^}]*?}\\s*})`, 'g'), 
      (match, before, after) => `${before}${prop}: 2${after}`);
  });
  
  // 5. Fix JSX comments - convert JS comments to JSX comments
  content = content.replace(/{\s*\/\/\s*([^}]*?)}/g, (match, comment) => {
    return `{/* ${comment.trim()} */}`;
  });
  
  // 6. Fix missing JSX closing tags
  // This is complex and may require manual fixes, but we can try to fix some common patterns
  content = content.replace(/<div>([^<]*?)<\/([a-zA-Z0-9_]+)>/g, (match, inner, tag) => {
    if (tag !== 'div') {
      return `<div>${inner}</div>`;
    }
    return match;
  });
  
  // 7. Fix unterminated string literals in JSX expressions
  // Find unterminated strings in JSX expressions like: { 'string }
  content = content.replace(/{\s*(['"])((?:(?!\1).)*?)(?:\s*}|$)/g, (match, quote, text) => {
    if (!match.includes(`${quote}}`)) {
      return `{${quote}${text}${quote}}`;
    }
    return match;
  });

  // 8. Fix missing values in braces, like {var} instead of {var: value}
  content = content.replace(/({[^:{}]*?)[,\s]*}(?=[,\s]*})/g, (match, inside) => {
    // Check if it might be an object without values
    if (/[a-zA-Z0-9_]+\s*$/.test(inside)) {
      return `${inside}: true}`;
    }
    return match;
  });
  
  // 9. Fix template literals in JSX that are incorrectly formatted
  content = content.replace(/{\s*`([^`]*?)}\s*`/g, (match, text) => {
    return `{\`${text}\`}`;
  });
  
  // 10. Fix incorrectly closed JSX expressions
  content = content.replace(/([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)\s*(\([^)]*?\))\s*'/g, (match, prop, func, args) => {
    return `${prop}: ${func}${args}`;
  });

  // 11. Fix component tags with extra spaces
  content = content.replace(/<\s*([A-Z][a-zA-Z0-9_]*)\s+(.*?)>/g, (match, component, props) => {
    return `<${component} ${props.trim()}>`;
  });

  // 12. Fix parentheses in function calls
  content = content.replace(/(\w+)\s*\(\s*('\)|"\))/g, (match, funcName, closing) => {
    // If closing looks like an unterminated string with a parenthesis
    return `${funcName}()`;
  });

  // 13. Fix spacing after JSX comments
  content = content.replace(/{\s*\/\*\s*(.*?)\s*\*\/\s*}/g, (match, comment) => {
    return `{/* ${comment.trim()} */}`;
  });
  
  // 14. Fix incorrect JSX fragments
  content = content.replace(/<>(.*?)<\/>/g, (match, content) => {
    return `<React.Fragment>${content}</React.Fragment>`;
  });

  // 15. Fix object property declarations with incorrect spacing
  content = content.replace(/([a-zA-Z0-9_]+)\s*<([^>]+)>/g, (match, prop, comparison) => {
    // Only if this looks like a incorrect prop comparison
    if (/\d+/.test(comparison)) {
      return `${prop}: ${comparison}`;
    }
    return match;
  });
  
  // Only write the file if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
    return true;
  }
  
  console.log(`No changes needed in ${filePath}`);
  return false;
};

// Process all JSX files
const processAllFiles = () => {
  // Find all JSX files
  const jsxFiles = glob.sync('frontend/src/**/*.jsx');
  
  console.log(`Found ${jsxFiles.length} JSX files to process`);
  
  let updatedCount = 0;
  
  jsxFiles.forEach(file => {
    if (fixJSXFile(file)) {
      updatedCount++;
    }
  });
  
  console.log(`Updated ${updatedCount} files`);
};

// Run the script
processAllFiles(); 