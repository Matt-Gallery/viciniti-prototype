#!/bin/bash

# Script to fix common issues in JSX files after conversion from TSX
# This script will:
# 1. Find all .jsx files in the frontend/src directory
# 2. Fix known issues that automated conversion might create

# Set the source directory
SRC_DIR="frontend/src"

echo "Fixing common issues in JSX files..."

# Find all .jsx files
find "$SRC_DIR" -name "*.jsx" | while read -r jsx_file; do
  echo "Processing $jsx_file"
  
  # Fix optional chaining in jsx files (sometimes TypeScript conversion breaks these)
  sed -i 's/&&\./\?\./g' "$jsx_file"
  
  # Remove any remaining TypeScript import statements
  sed -i '/import.*from.*\.types/d' "$jsx_file"
  sed -i '/import { SxProps, Theme } from/d' "$jsx_file"
  
  # Remove refs to TypeScript ESLint
  sed -i 's/\/\/ eslint-disable-line react-hooks\/exhaustive-deps//g' "$jsx_file"
  
  # Fix common React warnings
  sed -i 's/React.useState/useState/g' "$jsx_file"
  sed -i 's/React.useEffect/useEffect/g' "$jsx_file"
  sed -i 's/React.useRef/useRef/g' "$jsx_file"
  sed -i 's/React.forwardRef/forwardRef/g' "$jsx_file"
  
  echo "Completed processing $jsx_file"
done

# Now let's fix the main index.js file to ensure it properly imports the app
if [ -f "$SRC_DIR/index.jsx" ]; then
  echo "Updating main index.jsx file..."
  # Update the root render method for React 18
  sed -i 's/ReactDOM.render/const root = ReactDOM.createRoot(document.getElementById("root")); root.render/g' "$SRC_DIR/index.jsx"
  echo "Updated index.jsx file"
fi

echo "JSX fixing process completed!"
echo "You may need to manually review some files for edge cases." 