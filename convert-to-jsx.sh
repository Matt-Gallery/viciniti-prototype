#!/bin/bash

# Script to convert TypeScript React files (.tsx) to JavaScript React files (.jsx)
# This script will:
# 1. Find all .tsx files in the frontend/src directory
# 2. Create corresponding .jsx files in the same directory structure
# 3. Remove TypeScript-specific syntax from the files

# Set the source and destination directories
SRC_DIR="frontend/src"
BACKUP_DIR="frontend/src-ts-backup"

# Create a backup of the original source directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
  echo "Creating backup of original TypeScript files in $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  cp -r "$SRC_DIR"/* "$BACKUP_DIR"
fi

# Find all .tsx files
find "$SRC_DIR" -name "*.tsx" | while read -r tsx_file; do
  # Get the relative path from the source directory
  rel_path="${tsx_file#$SRC_DIR/}"
  
  # Create the new .jsx file path
  jsx_file="$SRC_DIR/${rel_path%.tsx}.jsx"
  
  # Create directories if needed
  mkdir -p "$(dirname "$jsx_file")"
  
  echo "Converting $tsx_file to $jsx_file"
  
  # Copy the file and replace the extension
  cp "$tsx_file" "$jsx_file"
  
  # Basic replacements to remove TypeScript syntax
  # Remove TypeScript interfaces and types
  sed -i '/^interface /,/^}/d' "$jsx_file"
  sed -i '/^type /,/;$/d' "$jsx_file"
  sed -i '/^export interface /,/^}/d' "$jsx_file"
  sed -i '/^export type /,/;$/d' "$jsx_file"
  
  # Remove TypeScript generic syntax
  sed -i 's/<[A-Za-z0-9_,\s]*>//g' "$jsx_file"
  
  # Remove type annotations in function parameters
  sed -i 's/\([a-zA-Z0-9_]*\): [a-zA-Z0-9_<>.]*\(,\|\s\)/\1\2/g' "$jsx_file"
  sed -i 's/\([a-zA-Z0-9_]*\)?: [a-zA-Z0-9_<>.]*\(,\|\s\)/\1\2/g' "$jsx_file"
  
  # Remove return type annotations
  sed -i 's/): [a-zA-Z0-9_<>.]* => {/\) => {/g' "$jsx_file"
  
  # Remove state type annotations
  sed -i 's/useState<[^>]*>/useState/g' "$jsx_file"
  
  # Remove forwardRef type parameters
  sed -i 's/forwardRef<[^>]*>/forwardRef/g' "$jsx_file"
  
  # Remove import statements for TypeScript types only
  sed -i '/import.*from.*\.types.*/d' "$jsx_file"
  
  # Remove specific linter directives for TypeScript
  sed -i 's/\/\/ eslint-disable-next-line @typescript-eslint\/no-unused-vars//g' "$jsx_file"
  
  echo "Conversion complete for $jsx_file"
done

# Optional: rename remaining .ts files to .js
find "$SRC_DIR" -name "*.ts" -not -name "*.d.ts" | while read -r ts_file; do
  rel_path="${ts_file#$SRC_DIR/}"
  js_file="$SRC_DIR/${rel_path%.ts}.js"
  
  echo "Converting $ts_file to $js_file"
  
  # Copy and convert
  cp "$ts_file" "$js_file"
  
  # Basic replacements for .ts files
  sed -i '/^interface /,/^}/d' "$js_file"
  sed -i '/^type /,/;$/d' "$js_file"
  sed -i '/^export interface /,/^}/d' "$js_file"
  sed -i '/^export type /,/;$/d' "$js_file"
  sed -i 's/: [A-Za-z0-9_<>.\[\]]*//g' "$js_file"
  
  echo "Conversion complete for $js_file"
done

echo "Conversion process completed!"
echo "You may need to manually review and fix the converted files"
echo "TypeScript backup is available in $BACKUP_DIR" 