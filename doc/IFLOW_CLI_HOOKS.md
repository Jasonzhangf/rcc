# iFlow CLI Hooks Configuration

## Overview

The iFlow CLI hooks system provides file creation validation to ensure that only authorized files are created during development. This security mechanism prevents accidental or unauthorized file creation outside of designated directories.

## Configuration Files

The hooks system consists of several components:

1. **`.iflow/settings.json`** - Main configuration file that defines when hooks are triggered (replaces the older hooks.json)
2. **`.claude/scripts/file-creation-hook.sh`** - Main hook script that validates file operations
3. **`.claude/scripts/file-allowlist-validator.sh`** - Script that checks if file paths are allowed
4. **`.claude/file-allowlist.json`** - Configuration file that defines allowed file paths and patterns

## How It Works

### Hook Triggers

The hooks are configured to trigger on specific tool operations:
- **PreToolUse**: Before Write, Edit, MultiEdit, or Bash tools are executed
- **PostToolUse**: After Write, Edit, MultiEdit, or Bash tools are executed
- **Stop**: When the iFlow CLI session ends

### File Validation Process

1. When a file creation operation is detected, the hook extracts the file path
2. The path is checked against the allowlist in `file-allowlist.json`
3. If the file is allowed, the operation proceeds
4. If the file is not allowed, the operation is blocked with an error message

## Allowlist Configuration

The `file-allowlist.json` file defines what files and directories are allowed:

### Directories
- `src/` - Source code files
- `dist/` - Compiled output
- `tests/` - Test files
- `docs/` - Documentation
- `tmp/` - Temporary files (special handling)
- And others...

### File Patterns
- `*.ts` - TypeScript files
- `*.js` - JavaScript files
- `*.json` - JSON files
- `*.md` - Markdown files
- And others...

### Specific Files
- `package.json` - Package configuration
- `tsconfig.json` - TypeScript configuration
- `.gitignore` - Git ignore file
- And others...

## Testing the Hooks

A test script (`tmp/test-hooks.sh`) has been created to verify that the hooks are working correctly:

1. **Allowed files**: Files in allowed directories should pass validation (exit code 0)
2. **Blocked files**: Files outside allowed directories should be blocked (exit code 2)
3. **Temporary files**: Files in the `tmp/` directory should be allowed (exit code 0)
4. **Hook execution**: All hook types should execute without errors (exit code 0)

## Usage Examples

### Creating Allowed Files
```bash
# This will succeed with exit code 0
echo "console.log('Hello World');" > src/hello.ts
```

### Creating Temporary Files
```bash
# This will succeed with exit code 0
echo "temporary content" > tmp/temp-file.txt
```

### Creating Blocked Files
```bash
# This will be blocked with exit code 2
echo "unauthorized content" > unauthorized.txt
```

When a file creation is blocked, the system provides guidance on how to proceed:
1. Add the file path to the allowlist
2. Use the tmp manager for temporary files
3. Place files in an allowed directory

## Exit Codes

The hooks system uses specific exit codes to indicate the result of operations:

- **0**: Success - File operation is allowed
- **2**: Blocked - File operation is not allowed (blocked by allowlist)
- **Other**: System error - Unexpected error occurred

## Adding New Allowed Paths

To add new paths to the allowlist:

1. **Add a directory**:
   ```bash
   ./.claude/scripts/file-allowlist-validator.sh add-dir "new-directory/"
   ```

2. **Add a specific file**:
   ```bash
   ./.claude/scripts/file-allowlist-validator.sh add-file "config/new-config.json"
   ```

3. **Add a file pattern**:
   ```bash
   ./.claude/scripts/file-allowlist-validator.sh add-pattern "*.xml"
   ```

4. **Manual JSON editing**: Edit `.claude/file-allowlist.json` directly

## Temporary File Management

The system includes a tmp manager script (`.claude/scripts/tmp-manager.sh`) for handling temporary files:

- `create` - Create temporary files
- `execute` - Execute temporary files safely
- `cleanup` - Clean up old temporary files
- `list` - List all temporary files

## Troubleshooting

### Common Issues

1. **File creation blocked**: Check if the file path is in an allowed directory or pattern
2. **Hook not triggering**: Verify the hooks.json configuration
3. **Permission errors**: Ensure scripts have execute permissions

### Log Files

- `.claude/hooks.log` - Hook execution logs
- `.claude/file-access.log` - File access logs
- `.claude/tmp-management.log` - Temporary file management logs

## Security Benefits

1. **Prevents unauthorized file creation**: Only explicitly allowed paths can be created
2. **Temporary file management**: Ensures temporary files are properly handled
3. **Audit trail**: All file operations are logged for review
4. **Consistent policy enforcement**: Rules are applied automatically to all file operations