# JSON Whitelist Management System

## Overview

The system has been upgraded to use JSON format whitelist files, providing better readability and manual management capabilities. Users can directly edit JSON files or use command-line tools to manage the whitelist.

## File Structure

### JSON Whitelist File
**Location**: `.claude/file-allowlist.json`

```json
{
  "file_creation_allowlist": {
    "meta": {
      "version": "1.0.0",
      "last_updated": "2024-01-15T10:30:00Z",
      "description": "File creation whitelist for RCC project",
      "managed_by": "claude-hooks"
    },
    "directories": [
      {
        "path": "src/",
        "description": "Source code directory",
        "allowed": true,
        "subdirectories": true,
        "notes": "All source code files and modules"
      }
      // ... other directories
    ],
    "file_patterns": [
      {
        "pattern": "*.ts",
        "description": "TypeScript source files",
        "allowed": true,
        "notes": "All TypeScript files"
      }
      // ... other file patterns
    ],
    "specific_files": [
      {
        "path": "package.json",
        "description": "NPM package configuration",
        "allowed": true,
        "notes": "Node.js package configuration"
      }
      // ... other specific files
    ],
    "temporary_files": {
      "directory": "tmp/",
      "description": "Temporary files directory",
      "allowed": true,
      "auto_cleanup": true,
      "max_age_days": 7,
      "notes": "All temporary and scratch files must be created here"
    },
    "rules": {
      "case_sensitive": false,
      "allow_subdirectories": true,
      "require_explicit_allow": true,
      "block_temp_files_outside_tmp": true,
      "log_all_attempts": true
    }
  }
}
```

## JSON Whitelist Structure Explanation

### 1. Metadata (meta)
```json
"meta": {
  "version": "1.0.0",           // Whitelist version
  "last_updated": "2024-01-15T10:30:00Z",  // Last update timestamp
  "description": "File creation whitelist for RCC project",  // Description
  "managed_by": "claude-hooks"  // Management tool
}
```

### 2. Directory Configuration (directories)
```json
"directories": [
  {
    "path": "src/",                    // Directory path
    "description": "Source code directory",  // Description
    "allowed": true,                    // Allow flag
    "subdirectories": true,              // Include subdirectories
    "notes": "All source code files and modules"  // Notes
  }
]
```

### 3. File Patterns (file_patterns)
```json
"file_patterns": [
  {
    "pattern": "*.ts",                // File pattern
    "description": "TypeScript source files",  // Description
    "allowed": true,                 // Allow flag
    "notes": "All TypeScript files"   // Notes
  }
]
```

### 4. Specific Files (specific_files)
```json
"specific_files": [
  {
    "path": "package.json",           // File path
    "description": "NPM package configuration",  // Description
    "allowed": true,                 // Allow flag
    "notes": "Node.js package configuration"  // Notes
  }
]
```

### 5. Temporary Files Configuration (temporary_files)
```json
"temporary_files": {
  "directory": "tmp/",               // Temporary directory
  "description": "Temporary files directory",  // Description
  "allowed": true,                   // Allow flag
  "auto_cleanup": true,               // Auto cleanup
  "max_age_days": 7,                 // Max age in days
  "notes": "All temporary and scratch files must be created here"  // Notes
}
```

### 6. Rules Configuration (rules)
```json
"rules": {
  "case_sensitive": false,           // Case sensitivity
  "allow_subdirectories": true,       // Allow subdirectories
  "require_explicit_allow": true,    // Require explicit allow
  "block_temp_files_outside_tmp": true,  // Block temp files outside tmp dir
  "log_all_attempts": true           // Log all attempts
}
```

## Manual Whitelist Management

### 1. Direct JSON Editing
Users can directly edit the `.claude/file-allowlist.json` file:

```bash
# Using your preferred editor
nano .claude/file-allowlist.json
vim .claude/file-allowlist.json
code .claude/file-allowlist.json
```

#### Adding New Directory
```json
{
  "path": "custom/",
  "description": "Custom directory for user files",
  "allowed": true,
  "subdirectories": true,
  "notes": "User-specific files and data"
}
```

#### Adding New File Pattern
```json
{
  "pattern": "*.xml",
  "description": "XML configuration files",
  "allowed": true,
  "notes": "XML data and configuration files"
}
```

#### Adding New Specific File
```json
{
  "path": "config/custom.json",
  "description": "Custom configuration file",
  "allowed": true,
  "notes": "User-specific configuration"
}
```

### 2. JSON Editing Notes
- Ensure JSON format is valid (use `jq` tool for validation)
- Each entry needs `allowed: true` to be allowed
- Paths should end with `/` to indicate directories
- File patterns should start with `*.` for extensions
- Changes take effect immediately

## Command Line Tools

### Basic Validation Commands
```bash
# Validate if file creation is allowed
./file-allowlist-validator.sh validate src/test.ts
./file-allowlist-validator.sh validate unauthorized.txt
```

### Whitelist Management Commands
```bash
# Show current whitelist (JSON format)
./file-allowlist-validator.sh list

# Add specific file to whitelist
./file-allowlist-validator.sh add-file "config/custom.json"

# Add directory to whitelist (auto-add trailing slash)
./file-allowlist-validator.sh add-dir "custom/"

# Add file pattern to whitelist
./file-allowlist-validator.sh add-pattern "*.xml"

# Generic add command
./file-allowlist-validator.sh add "config/custom.json" "specific_file"
./file-allowlist-validator.sh add "custom/" "directory"
./file-allowlist-validator.sh add "*.xml" "file_pattern"
```

### Information Commands
```bash
# Show JSON whitelist information
./file-allowlist-validator.sh json-info

# Show access logs
./file-allowlist-validator.sh logs
```

## Validation Priority

The system validates files in the following order:

1. **Specific Files** (specific_files) - Exact file path matching
2. **Directories** (directories) - Check if file is in allowed directories
3. **File Patterns** (file_patterns) - Check file extensions
4. **Temporary Files** (temporary_files) - Check if in temp directory

## Example Scenarios

### Scenario 1: Allow New Configuration File
```json
{
  "path": "config/database.json",
  "description": "Database configuration file",
  "allowed": true,
  "notes": "Database connection settings"
}
```

### Scenario 2: Allow New File Type
```json
{
  "pattern": "*.xml",
  "description": "XML configuration files",
  "allowed": true,
  "notes": "XML data and configuration files"
}
```

### Scenario 3: Allow New Directory
```json
{
  "path": "data/",
  "description": "Data files directory",
  "allowed": true,
  "subdirectories": true,
  "notes": "User data and configuration files"
}
```

## Error Handling

### Common Errors and Solutions

#### 1. JSON Format Errors
```bash
# Validate JSON format
jq . .claude/file-allowlist.json

# Error example
parse error: Expected string key before colon at line 25, column 15
# Solution: Check JSON syntax, ensure quotes, brackets, commas are correct
```

#### 2. Duplicate Entries
```bash
# System uses first matching entry
# Ensure no conflicting entry definitions
```

#### 3. Path Matching Issues
```bash
# Ensure directory paths end with /
# Ensure file paths don't have extra / or ..
```

## Best Practices

### 1. Regular Backups
```bash
# Manual backup
cp .claude/file-allowlist.json .claude/file-allowlist.json.backup

# System automatically creates .bak files
```

### 2. Version Control
```bash
# Include whitelist file in version control
git add .claude/file-allowlist.json
git commit -m "Update file allowlist"
```

### 3. Regular Review
- Periodically check if whitelist entries are still needed
- Remove unnecessary entries
- Update descriptions and notes for accuracy

### 4. Test Changes
```bash
# Test after each modification
./file-allowlist-validator.sh validate new-file.json
./file-allowlist-validator.sh validate temp_file.txt
```

## Backward Compatibility

The system still supports the old text format whitelist (`.claude/file-allowlist.txt`) but recommends using JSON format:

- JSON format has higher priority
- If JSON file exists, JSON format is used
- Old format still works but with limited features

## Troubleshooting

### Missing jq Tool
If `jq` tool is not available on the system, install it:

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq
```

Or the system will automatically fall back to the old text format.

### Permission Issues
```bash
# Ensure script is executable
chmod +x .claude/scripts/file-allowlist-validator.sh

# Ensure whitelist file is readable/writable
chmod 644 .claude/file-allowlist.json
```

This JSON whitelist management system provides powerful and flexible file creation control while maintaining usability and maintainability.