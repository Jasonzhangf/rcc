# File Creation Whitelisting System

## Overview

This system implements a strict file creation whitelist for the RCC project, preventing unauthorized file creation in the root directory and directing temporary files to the `./tmp` directory.

## Components

### 1. File Allowlist Validator
**File**: `.claude/scripts/file-allowlist-validator.sh`

Validates file creation against a predefined whitelist:
- Blocks files not in the allowlist
- Redirects temporary files to `./tmp/` directory
- Logs all file access attempts
- Provides clear error messages and guidance

**Usage**:
```bash
# Validate a file path
./file-allowlist-validator.sh validate src/test.ts        # ✅ Allowed
./file-allowlist-validator.sh validate unauthorized.txt # ❌ Blocked

# Manage allowlist
./file-allowlist-validator.sh list         # Show current allowlist
./file-allowlist-validator.sh add "*.log" # Add new pattern
./file-allowlist-validator.sh logs         # Show access logs
```

### 2. Temporary File Manager
**File**: `.claude/scripts/tmp-manager.sh`

Manages the lifecycle of temporary files:
- Creates temporary files only in `./tmp/` directory
- Executes temporary files safely
- Automatically cleans up old files (older than 7 days)
- Provides comprehensive logging

**Usage**:
```bash
# Create temporary files
./tmp-manager.sh create test.tmp "Hello World"
./tmp-manager.sh create script.sh "#!/bin/bash\necho test"

# Execute temporary files
./tmp-manager.sh execute test.tmp
./tmp-manager.sh execute script.sh

# Quick execution (create, execute, remove)
./tmp-manager.sh quick-exec script.sh "#!/bin/bash\necho test"

# Manage temporary files
./tmp-manager.sh list    # List all temp files
./tmp-manager.sh cleanup # Clean up old files
./tmp-manager.sh remove test.tmp
./tmp-manager.sh logs    # Show management logs
```

### 3. Claude Code Hooks
**File**: `~/.claude/hooks.json`

Configures Claude Code hooks to enforce file creation rules:
- **PreToolUse**: Triggers validation before Write, Edit, MultiEdit operations
- **PostToolUse**: Cleans up temporary files after operations
- **Stop**: Performs cleanup when Claude Code session ends

## Allowlist Configuration

### JSON Allowlist Structure
The system creates a comprehensive JSON allowlist at `.claude/file-allowlist.json` containing:

```json
{
  "file_creation_allowlist": {
    "directories": [
      {"path": "src/", "description": "Source code directory", "allowed": true},
      {"path": "dist/", "description": "Compiled output directory", "allowed": true},
      {"path": "tests/", "description": "Test files directory", "allowed": true},
      {"path": "docs/", "description": "Documentation directory", "allowed": true},
      {"path": "tools/", "description": "Development tools directory", "allowed": true},
      {"path": "config/", "description": "Configuration files directory", "allowed": true},
      {"path": ".claude/", "description": "Claude configuration directory", "allowed": true},
      {"path": ".github/", "description": "GitHub workflows directory", "allowed": true},
      {"path": "docker/", "description": "Docker configuration directory", "allowed": true},
      {"path": "examples/", "description": "Example files directory", "allowed": true},
      {"path": "coverage/", "description": "Test coverage directory", "allowed": true},
      {"path": "logs/", "description": "Log files directory", "allowed": true}
    ],
    "file_patterns": [
      {"pattern": "*.ts", "description": "TypeScript source files", "allowed": true},
      {"pattern": "*.js", "description": "JavaScript files", "allowed": true},
      {"pattern": "*.json", "description": "JSON configuration files", "allowed": true},
      {"pattern": "*.md", "description": "Markdown documentation", "allowed": true},
      {"pattern": "*.yml", "description": "YAML configuration files", "allowed": true},
      {"pattern": "*.yaml", "description": "YAML configuration files", "allowed": true},
      {"pattern": "*.env", "description": "Environment files", "allowed": true},
      {"pattern": "*.config.js", "description": "JavaScript config files", "allowed": true},
      {"pattern": "*.test.ts", "description": "TypeScript test files", "allowed": true},
      {"pattern": "*.spec.ts", "description": "TypeScript spec files", "allowed": true},
      {"pattern": "*.lock.json", "description": "Lock files", "allowed": true},
      {"pattern": "*.log", "description": "Log files", "allowed": true}
    ],
    "specific_files": [
      {"path": "package.json", "description": "NPM package configuration", "allowed": true},
      {"path": "package-lock.json", "description": "NPM lock file", "allowed": true},
      {"path": "tsconfig.json", "description": "TypeScript configuration", "allowed": true},
      {"path": ".gitignore", "description": "Git ignore file", "allowed": true},
      {"path": ".npmignore", "description": "NPM ignore file", "allowed": true},
      {"path": ".nvmrc", "description": "Node version file", "allowed": true},
      {"path": ".env.example", "description": "Environment example file", "allowed": true},
      {"path": "CHANGELOG.md", "description": "Change log file", "allowed": true},
      {"path": "CONTRIBUTING.md", "description": "Contributing guidelines", "allowed": true},
      {"path": "LICENSE", "description": "License file", "allowed": true},
      {"path": "README.md", "description": "Project README", "allowed": true}
    ]
  }
}
```

### Manual JSON Editing
Users can directly edit the JSON allowlist file:

```bash
# Edit JSON allowlist
nano .claude/file-allowlist.json
code .claude/file-allowlist.json
```

#### Adding New Directory
```json
{
  "path": "custom/",
  "description": "Custom directory for user files", 
  "allowed": true,
  "subdirectories": true,
  "notes": "User-specific files"
}
```

#### Adding New File Pattern
```json
{
  "pattern": "*.xml",
  "description": "XML configuration files",
  "allowed": true,
  "notes": "XML data files"
}
```

#### Adding New Specific File
```json
{
  "path": "config/custom.json",
  "description": "Custom configuration",
  "allowed": true,
  "notes": "User-specific config"
}
```

### Command Line Management
```bash
# Add specific file
./file-allowlist-validator.sh add-file "config/custom.json"

# Add directory
./file-allowlist-validator.sh add-dir "custom/"

# Add file pattern
./file-allowlist-validator.sh add-pattern "*.xml"

# Generic add command
./file-allowlist-validator.sh add "config/custom.json" "specific_file"

# Show current allowlist
./file-allowlist-validator.sh list

# Show JSON info
./file-allowlist-validator.sh json-info

# View access logs
./file-allowlist-validator.sh logs
```

### Pattern Types for Add Command
- `specific_file` - Exact file path (e.g., "config/custom.json")
- `directory` - Directory path (e.g., "src/custom/")
- `file_pattern` - File pattern (e.g., "*.xml")

## Security Enforcement

### File Creation Rules
1. **Root Directory Protection**: Files can only be created in allowlisted directories
2. **Temporary File Redirection**: All temp files must go to `./tmp/`
3. **Pattern Matching**: Supports exact paths, directory patterns, and file extensions
4. **Logging**: All file access attempts are logged for audit

### Hook Enforcement
- **Prevention**: Blocks unauthorized file creation before it happens
- **Automatic Cleanup**: Removes old temporary files automatically
- **Session Management**: Cleans up when Claude Code sessions end

## Integration with Development Workflow

### Manual Validation
```bash
# Validate before file operations
./file-allowlist-validator.sh validate new-file.js

# Create temporary files for scratch work
./tmp-manager.sh quick-exec scratch.js "console.log('test');"
```

### Automated Validation
Claude Code hooks automatically validate:
- **Write operations**: Creating new files
- **Edit operations**: Modifying existing files
- **MultiEdit operations**: Batch file operations

## Error Handling

### Blocked File Creation
When unauthorized file creation is attempted:
```bash
❌ FILE CREATION BLOCKED:
   File: unauthorized_file.txt
   Reason: File path not in allowlist
   
   To allow this file:
   1. Add the path to .claude/file-allowlist.txt
   2. Or place temporary files in ./tmp/ directory
```

### Temporary File Enforcement
When temporary files are created outside `./tmp/`:
```bash
❌ TEMP FILE ERROR: Temporary files must be placed in ./tmp directory
   Attempted to create: temp_file.txt
   Expected location: ./tmp/temp_file.txt
```

## Monitoring and Logging

### File Access Logs
```bash
./file-allowlist-validator.sh logs
```

Shows:
```bash
[2024-01-15 10:30:45] CREATE - src/test.ts - ALLOWED
[2024-01-15 10:31:02] CREATE - unauthorized.txt - BLOCKED
```

### Temporary File Management Logs
```bash
./tmp-manager.sh logs
```

Shows:
```bash
[2024-01-15 10:30:45] CREATE - /path/to/tmp/test.tmp
[2024-01-15 10:31:02] EXECUTE - /path/to/tmp/test.tmp - Exit: 0
[2024-01-15 10:31:10] REMOVE - /path/to/tmp/test.tmp
```

## Best Practices

### 1. File Organization
- Place all project files in allowlisted directories
- Use `./tmp/` for all temporary and scratch files
- Follow the established directory structure

### 2. Temporary File Management
- Use `quick-exec` for one-off scripts and experiments
- Regular manual cleanup with `./tmp-manager.sh cleanup`
- Monitor temporary file usage with logs

### 3. Allowlist Management
- Review and update allowlist as project evolves
- Use specific patterns rather than broad allowances
- Regular audit of allowlist contents

### 4. Development Workflow
- Validate file paths before operations
- Use hooks for automated enforcement
- Monitor logs for compliance issues

## Troubleshooting

### Common Issues
1. **File creation blocked**: Check allowlist patterns
2. **Temporary file errors**: Use `./tmp/` directory
3. **Hook failures**: Check script permissions and paths

### Testing the System
```bash
# Test allowlist validation
./file-allowlist-validator.sh validate src/test.ts        # Should succeed
./file-allowlist-validator.sh validate unauthorized.txt # Should fail

# Test temporary file management
./tmp-manager.sh create test.tmp "test content"          # Should succeed
./tmp-manager.sh list                                    # Should show the file
./tmp-manager.sh remove test.tmp                         # Should remove the file

# Test hooks
./file-creation-hook.sh test                             # Should run validation tests
```

This system ensures that all file creation in the RCC project follows the established governance rules, maintaining security and project structure integrity.