#!/bin/bash

# RCC Module Management Tool
#
# Comprehensive tool for managing RCC modules (Create, Read, Update, Delete operations)
# Ensures consistent module structure and API registry synchronization
#
# Usage:
#   ./scripts/module-manager.sh <action> [options]
#
# Actions:
#   create <module_name>                    Create a new module
#   list                                    List all modules
#   inspect <module_name>                  Show module details
#   update <module_name>                   Update module API registry
#   delete <module_name>                   Delete a module
#   validate <module_name>                 Validate module structure and API
#   sync                                    Sync all modules with API registry
#   help                                    Show help message

set -e  # Exit on any error

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MODULES_PATH="$PROJECT_ROOT/src/modules"
API_REGISTRY_FILE="$PROJECT_ROOT/.claude/module-api-registry.json"
MODULE_TEMPLATE_FILE="$PROJECT_ROOT/.claude/templates/module-template.json"
VALIDATION_SCRIPT="$PROJECT_ROOT/scripts/validate-module-api-registry.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
VERBOSE=false
DRY_RUN=false
FORCE=false
SKIP_VALIDATION=false
BACKUP_ENABLED=true

# Help function
show_help() {
  cat << EOF
RCC Module Management Tool

Usage: $0 <action> [options]

Actions:
  create <module_name>                    Create a new module
  list                                    List all modules
  inspect <module_name>                  Show module details
  update <module_name>                   Update module API registry
  delete <module_name>                   Delete a module
  validate <module_name>                 Validate module structure and API
  sync                                    Sync all modules with API registry
  help                                    Show this help message

Options:
  --verbose                               Verbose output
  --dry-run                               Show what would be done without doing it
  --force                                 Force operation (bypass confirmation prompts)
  --skip-validation                       Skip validation steps
  --no-backup                             Don't create backup before delete/modify operations
  --help                                  Show this help message

Examples:
  $0 create MyModule                      # Create new module
  $0 list --verbose                      # List all modules with details
  $0 inspect MyModule                    # Show module details
  $0 update MyModule --force             # Update module API registry
  $0 delete MyModule --no-backup         # Delete module without backup
  $0 validate MyModule                   # Validate module structure
  $0 sync                                 # Sync all modules

EOF
}

# Parse command line arguments
ACTION="$1"
MODULE_NAME="$2"

# Check for help first
if [[ "$ACTION" == "help" ]]; then
  show_help
  exit 0
fi

# Parse options for actions that support them
case "$ACTION" in
  "create"|"update"|"delete"|"validate"|"inspect")
    # Shift action and module name, then parse options
    shift 2 || true
    while [[ $# -gt 0 ]]; do
      case $1 in
        --verbose)
          VERBOSE=true
          shift
          ;;
        --dry-run)
          DRY_RUN=true
          shift
          ;;
        --force)
          FORCE=true
          shift
          ;;
        --skip-validation)
          SKIP_VALIDATION=true
          shift
          ;;
        --no-backup)
          BACKUP_ENABLED=false
          shift
          ;;
        *)
          echo "Unknown option $1"
          show_help
          exit 1
          ;;
      esac
    done
    
    # For these actions, module name is required
    if [[ -z "$MODULE_NAME" ]]; then
      echo "Error: Module name is required for $ACTION action"
      show_help
      exit 1
    fi
    ;;
  "list"|"sync")
    # For list and sync, module name should be empty, parse any remaining options
    shift 1 || true
    while [[ $# -gt 0 ]]; do
      case $1 in
        --verbose)
          VERBOSE=true
          shift
          ;;
        --dry-run)
          DRY_RUN=true
          shift
          ;;
        --no-backup)
          BACKUP_ENABLED=false
          shift
          ;;
        *)
          echo "Unknown option $1"
          show_help
          exit 1
          ;;
      esac
    done
    ;;
  "")
    echo "Error: No action specified"
    show_help
    exit 1
    ;;
  *)
    echo "Error: Unknown action '$ACTION'"
    show_help
    exit 1
    ;;
esac

# Utility functions
log() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
  fi
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_info() {
  echo -e "${CYAN}[INFO]${NC} $1"
}

log_module() {
  echo -e "${PURPLE}[MODULE]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
  log "Checking prerequisites..."
  
  # Check if we're in the right directory
  if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    log_error "Could not find package.json. Please run this script from the project root."
    exit 1
  fi
  
  # Check if API registry file exists
  if [ ! -f "$API_REGISTRY_FILE" ]; then
    log_error "API registry file not found: $API_REGISTRY_FILE"
    exit 1
  fi
  
  # Check if validation script exists
  if [ ! -f "$VALIDATION_SCRIPT" ]; then
    log_error "Validation script not found: $VALIDATION_SCRIPT"
    exit 1
  fi
  
  # Check if Node.js is available for validation
  if ! command -v node &> /dev/null; then
    log_error "Node.js is required for validation but not installed"
    exit 1
  fi
  
  log_success "Prerequisites check passed"
}

# Load API registry
load_api_registry() {
  if [ ! -f "$API_REGISTRY_FILE" ]; then
    log_error "API registry file not found: $API_REGISTRY_FILE"
    exit 1
  fi
  
  cat "$API_REGISTRY_FILE"
}

# Save API registry with backup
save_api_registry() {
  local content="$1"
  local operation="$2"
  
  if [ "$BACKUP_ENABLED" = true ] && [ -f "$API_REGISTRY_FILE" ]; then
    local backup_file="${API_REGISTRY_FILE}.backup.$(date +'%Y%m%d_%H%M%S')"
    cp "$API_REGISTRY_FILE" "$backup_file"
    log_info "Backup created: $backup_file"
  fi
  
  echo "$content" > "$API_REGISTRY_FILE"
  log_success "API registry updated for $operation"
}

# Create backup of module
backup_module() {
  local module_path="$1"
  local module_name="$2"
  
  if [ ! -d "$module_path" ]; then
    log_warning "Module directory not found, skipping backup: $module_path"
    return 1
  fi
  
  local backup_dir="$PROJECT_ROOT/backups/modules/$module_name"
  local backup_timestamped="$backup_dir.$(date +'%Y%m%d_%H%M%S')"
  
  mkdir -p "$(dirname "$backup_timestamped")"
  cp -r "$module_path" "$backup_timestamped"
  
  log_info "Module backup created: $backup_timestamped"
}

# List all modules
list_modules() {
  log_info "Listing all modules..."
  
  local api_registry
  api_registry=$(load_api_registry)
  
  echo ""
  echo -e "${PURPLE}=== RCC Modules ===${NC}"
  echo ""
  
  # Extract module names from API registry
  local module_names
  module_names=$(echo "$api_registry" | jq -r '.module_apis | keys[]' | grep -v '^BaseModule$' || true)
  
  if [ -z "$module_names" ]; then
    log_warning "No modules found in API registry"
    return 0
  fi
  
  echo -e "${CYAN}Modules in API Registry:${NC}"
  echo "┌────────────────────────────┬─────────────┬─────────────────────────────────────────────────────┐"
  echo "│ Module Name               │ Version     │ Description                                          │"
  echo "├────────────────────────────┼─────────────┼─────────────────────────────────────────────────────┤"
  
  for module_name in $module_names; do
    local module_info
    local version
    local description
    
    module_info=$(echo "$api_registry" | jq -r ".module_apis[\"$module_name\"].module")
    version=$(echo "$module_info" | jq -r '.version // "N/A"')
    description=$(echo "$module_info" | jq -r '.description // "N/A"')
    
    # Truncate description if too long
    if [ ${#description} -gt 50 ]; then
      description="${description:0:47}..."
    fi
    
    printf "│ %-25s │ %-11s │ %-53s │\n" "$module_name" "$version" "$description"
  done
  
  echo "└────────────────────────────┴─────────────┴─────────────────────────────────────────────────────┘"
  
  # Check for modules in file system but not in registry
  if [ -d "$MODULES_PATH" ]; then
    local file_modules
    file_modules=$(find "$MODULES_PATH" -maxdepth 1 -type d -name "[!_]*" -exec basename {} \; | sort)
    
    local unregistered_modules=""
    for file_module in $file_modules; do
      if ! echo "$module_names" | grep -q "^$file_module$"; then
        if [ -n "$unregistered_modules" ]; then
          unregistered_modules="$unregistered_modules, $file_module"
        else
          unregistered_modules="$file_module"
        fi
      fi
    done
    
    if [ -n "$unregistered_modules" ]; then
      echo ""
      echo -e "${YELLOW}Modules in filesystem but not in registry:${NC} $unregistered_modules"
      echo "Run '$0 sync' to register them."
    fi
  fi
  
  echo ""
  echo "Total modules: $(echo "$module_names" | wc -l | tr -d ' ')"
}

# Show module details
inspect_module() {
  local module_name="$1"
  
  if [ -z "$module_name" ]; then
    log_error "Module name is required for inspect action"
    exit 1
  fi
  
  log_info "Inspecting module: $module_name"
  
  local api_registry
  api_registry=$(load_api_registry)
  
  # Check if module exists in registry
  if ! echo "$api_registry" | jq -e ".module_apis[\"$module_name\"]" > /dev/null; then
    log_error "Module '$module_name' not found in API registry"
    return 1
  fi
  
  echo ""
  echo -e "${PURPLE}=== Module: $module_name ===${NC}"
  echo ""
  
  # Module information
  local module_info
  module_info=$(echo "$api_registry" | jq -r ".module_apis[\"$module_name\"].module")
  
  echo -e "${CYAN}Module Information:${NC}"
  echo "┌────────────────────────────┬─────────────────────────────────────────────────────┐"
  echo "│ Field                     │ Value                                                 │"
  echo "├────────────────────────────┼─────────────────────────────────────────────────────┤"
  printf "│ %-25s │ %-53s │\n" "Name" "$(echo "$module_info" | jq -r '.name // "N/A"')"
  printf "│ %-25s │ %-53s │\n" "Version" "$(echo "$module_info" | jq -r '.version // "N/A"')"
  printf "│ %-25s │ %-53s │\n" "Base Path" "$(echo "$module_info" | jq -r '.basePath // "N/A"')"
  printf "│ %-25s │ %-53s │\n" "Description" "$(echo "$module_info" | jq -r '.description // "N/A"')"
  echo "└────────────────────────────┴─────────────────────────────────────────────────────┘"
  echo ""
  
  # Endpoints
  local endpoints
  endpoints=$(echo "$api_registry" | jq -c ".module_apis[\"$module_name\"].endpoints[]")
  local endpoint_count=$(echo "$api_registry" | jq ".module_apis[\"$module_name\"].endpoints | length")
  
  echo -e "${CYAN}API Endpoints ($endpoint_count):${NC}"
  echo "┌────────────────────────────┬─────────┬─────────────┬─────────────────────────────────────────────────────┐"
  echo "│ Method                    │ Path    │ Access      │ Description                                          │"
  echo "├────────────────────────────┼─────────┼─────────────┼─────────────────────────────────────────────────────┤"
  
  echo "$endpoints" | while IFS= read -r endpoint; do
    local method
    local path
    local access
    local description
    
    method=$(echo "$endpoint" | jq -r '.method // "N/A"')
    path=$(echo "$endpoint" | jq -r '.path // "N/A"')
    access=$(echo "$endpoint" | jq -r '.access // "N/A"')
    description=$(echo "$endpoint" | jq -r '.description // "N/A"')
    
    # Truncate description if too long
    if [ ${#description} -gt 50 ]; then
      description="${description:0:47}..."
    fi
    
    printf "│ %-25s │ %-7s │ %-11s │ %-53s │\n" "$method" "$path" "$access" "$description"
  done
  echo "└────────────────────────────┴─────────┴─────────────┴─────────────────────────────────────────────────────┘"
  
  # File system check
  local module_path="$MODULES_PATH/$module_name"
  if [ -d "$module_path" ]; then
    echo ""
    echo -e "${CYAN}File System Status:${NC}"
    echo "✅ Module directory exists: $module_path"
    
    # Check essential files
    local essential_files=(
      "src/index.ts"
      "README.md"
      "__test__"
    )
    
    for file in "${essential_files[@]}"; do
      if [ -e "$module_path/$file" ]; then
        echo "✅ $file"
      else
        echo "❌ $file (missing)"
      fi
    done
  else
    echo ""
    echo -e "${RED}File System Status:${NC}"
    echo "❌ Module directory not found: $module_path"
  fi
  
  echo ""
}

# Create new module
create_module() {
  local module_name="$1"
  
  if [ -z "$module_name" ]; then
    log_error "Module name is required for create action"
    exit 1
  fi
  
  log_info "Creating module: $module_name"
  
  local module_path="$MODULES_PATH/$module_name"
  
  # Check if module already exists
  if [ -d "$module_path" ]; then
    log_error "Module directory already exists: $module_path"
    exit 1
  fi
  
  # Check if module exists in API registry
  local api_registry
  api_registry=$(load_api_registry)
  
  if echo "$api_registry" | jq -e ".module_apis[\"$module_name\"]" > /dev/null; then
    log_error "Module '$module_name' already exists in API registry"
    exit 1
  fi
  
  # Create module directory structure
  if [ "$DRY_RUN" = false ]; then
    log_info "Creating module directory structure..."
    
    mkdir -p "$module_path"/{src,__test__,constants,interfaces,types}
    
    # Create src/index.ts
    cat > "$module_path/src/index.ts" << EOF
import { BaseModule } from '../../core/BaseModule';
import { ModuleInfo } from '../../interfaces/ModuleInfo';

export class ${module_name} extends BaseModule {
  constructor(info: ModuleInfo) {
    super(info);
  }
  
  public async initialize(config: any): Promise<void> {
    // TODO: Implement initialization logic
    log('\${this.moduleInfo.name} initialized');
  }
  
  public async destroy(): Promise<void> {
    // TODO: Implement cleanup logic
    log('\${this.moduleInfo.name} destroyed');
  }
  
  public async handshake(moduleInfo: any, connectionInfo: any): Promise<void> {
    // TODO: Implement handshake logic
    log('\${this.moduleInfo.name} handshake with \${moduleInfo.name}');
  }
  
  public getModuleInfo() {
    return this.moduleInfo;
  }
  
  public get moduleConfig() {
    return this.config;
  }
}

// Helper function for logging
function log(message: string) {
  console.log(\`[\${new Date().toISOString()}] \${message}\`);
}
EOF

    # Create README.md
    cat > "$module_path/README.md" << EOF
# ${module_name}

## Description

TODO: Add description for this module.

## Installation

This module is part of the RCC system. No additional installation is required.

## Usage

\`\`\`typescript
import { ${module_name} } from './src';

const module = new ${module_name}({
  name: '${module_name}',
  version: '1.0.0',
  description: 'TODO: Add module description'
});
\`\`\`

## API

### Public Methods

- \`initialize(config: any): Promise<void>\` - Initialize the module
- \`destroy(): Promise<void>\` - Clean up the module
- \`handshake(moduleInfo: any, connectionInfo: any): Promise<void>\` - Perform handshake
- \`getModuleInfo()\` - Get module information
- \`moduleConfig\` - Get module configuration

## Development

### Running Tests

\`\`\`bash
npm test -- ${module_name}
\`\`\`

### Building

\`\`\`bash
npm run build
\`\`\`

## License

This module is part of the RCC project and follows the same license.
EOF

    # Create basic test file
    cat > "$module_path/__test__/${module_name}.test.ts" << EOF
import { ${module_name} } from '../src/index';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('${module_name}', () => {
  let module: ${module_name};
  let moduleInfo: ModuleInfo;
  
  beforeEach(() => {
    moduleInfo = {
      name: '${module_name}',
      version: '1.0.0',
      description: 'Test module',
      dependencies: []
    };
    module = new ${module_name}(moduleInfo);
  });
  
  afterEach(() => {
    // Clean up if needed
  });
  
  describe('constructor', () => {
    it('should create module instance', () => {
      expect(module).toBeInstanceOf(${module_name});
    });
    
    it('should set module info', () => {
      expect(module.getModuleInfo()).toBe(moduleInfo);
    });
  });
  
  describe('getModuleInfo', () => {
    it('should return module information', () => {
      const info = module.getModuleInfo();
      expect(info).toBe(moduleInfo);
    });
  });
  
  describe('moduleConfig', () => {
    it('should return module configuration', () => {
      // This test may need adjustment based on your BaseModule implementation
      expect(module.moduleConfig).toBeDefined();
    });
  });
  
  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(module.initialize({})).resolves.not.toThrow();
    });
  });
  
  describe('destroy', () => {
    it('should destroy successfully', async () => {
      await expect(module.destroy()).resolves.not.toThrow();
    });
  });
  
  describe('handshake', () => {
    it('should perform handshake successfully', async () => {
      const otherModuleInfo = {
        name: 'OtherModule',
        version: '1.0.0',
        description: 'Other module for testing',
        dependencies: []
      };
      
      const connectionInfo = {
        hostname: 'localhost',
        port: 3000,
        protocol: 'http',
        path: '/'
      };
      
      await expect(module.handshake(otherModuleInfo, connectionInfo)).resolves.not.toThrow();
    });
  });
});
EOF

    # Create constants file
    cat > "$module_path/constants/${module_name}.constants.ts" << EOF
export const ${module_name.toUpperCase()}_VERSION = '1.0.0';
export const ${module_name.toUpperCase()}_DEFAULT_CONFIG = {
  // Add default configuration values here
};

// Add other module-specific constants
EOF

    # Create interfaces file
    cat > "$module_path/interfaces/I${module_name}.interface.ts" << EOF
export interface I${module_name} {
  // Add module-specific interfaces here
}

export interface ${module_name}Config {
  // Add configuration interface here
}
EOF

    # Create types file
    cat > "$module_path/types/${module_name}.types.ts" << EOF
export type ${module_name}Status = 'idle' | 'running' | 'stopped' | 'error';

// Add other module-specific types here
EOF

  fi
  
  # Add to API registry
  log_info "Adding module to API registry..."
  
  local new_registry
  new_registry=$(echo "$api_registry" | jq --arg name "$module_name" '
    .module_apis[$name] = {
      "module": {
        "name": $name,
        "description": "TODO: Add module description",
        "version": "1.0.0",
        "basePath": ("/api/" + ($name | ascii_downcase))
      },
      "endpoints": [
        {
          "name": "initialize",
          "description": "Initialize the module",
          "method": "POST",
          "path": "/initialize",
          "parameters": [],
          "returnType": "Promise<void>",
          "access": "public"
        },
        {
          "name": "destroy",
          "description": "Clean up the module",
          "method": "POST",
          "path": "/destroy",
          "parameters": [],
          "returnType": "Promise<void>",
          "access": "public"
        },
        {
          "name": "handshake",
          "description": "Perform handshake with another module",
          "method": "POST",
          "path": "/handshake",
          "parameters": [
            {
              "name": "moduleInfo",
              "type": "ModuleInfo",
              "description": "Target module information",
              "required": true
            },
            {
              "name": "connectionInfo",
              "type": "ConnectionInfo",
              "description": "Connection information",
              "required": true
            }
          ],
          "returnType": "Promise<void>",
          "access": "public"
        }
      ]
    }
  ')
  
  if [ "$DRY_RUN" = false ]; then
    save_api_registry "$new_registry" "created module $module_name"
  fi
  
  log_success "Module '$module_name' created successfully"
  
  # Validate the created module
  if [ "$SKIP_VALIDATION" = false ]; then
    log_info "Validating created module..."
    validate_module "$module_name"
  fi
  
  echo ""
  echo -e "${CYAN}Next steps:${NC}"
  echo "1. Edit $module_path/src/index.ts to implement module functionality"
  echo "2. Update README.md with detailed description and API documentation"
  echo "3. Implement additional public methods and add them to API registry"
  echo "4. Add comprehensive tests in __test__/ directory"
  echo "5. Run '$0 validate $module_name' to check module structure"
  echo ""
}

# Update module API registry
update_module() {
  local module_name="$1"
  
  if [ -z "$module_name" ]; then
    log_error "Module name is required for update action"
    exit 1
  fi
  
  log_info "Updating module: $module_name"
  
  local api_registry
  api_registry=$(load_api_registry)
  
  # Check if module exists in registry
  if ! echo "$api_registry" | jq -e ".module_apis[\"$module_name\"]" > /dev/null; then
    log_error "Module '$module_name' not found in API registry"
    return 1
  fi
  
  # For now, update means updating the description and version
  # In future versions, this could do more sophisticated analysis
  
  local current_version
  current_version=$(echo "$api_registry" | jq -r ".module_apis[\"$module_name\"].module.version")
  
  # Increment version
  local new_version
  if [[ $current_version =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    local major=${BASH_REMATCH[1]}
    local minor=${BASH_REMATCH[2]}
    local patch=${BASH_REMATCH[3]}
    new_version="$major.$((minor + 1)).$patch"
  else
    new_version="1.0.0"
  fi
  
  local updated_registry
  updated_registry=$(echo "$api_registry" | jq --arg name "$module_name" --arg version "$new_version" '
    .module_apis[$name].module.version = $version
  ')
  
  if [ "$DRY_RUN" = false ]; then
    save_api_registry "$updated_registry" "updated module $module_name to version $new_version"
  fi
  
  log_success "Module '$module_name' updated to version $new_version"
}

# Delete module
delete_module() {
  local module_name="$1"
  
  if [ -z "$module_name" ]; then
    log_error "Module name is required for delete action"
    exit 1
  fi
  
  if [ "$FORCE" = false ]; then
    echo -e "${YELLOW}This will permanently delete module '$module_name'${NC}"
    echo "Are you sure? (y/N): "
    read -r confirmation
    if [[ ! $confirmation =~ ^[Yy]$ ]]; then
      log_info "Deletion cancelled"
      exit 0
    fi
  fi
  
  log_info "Deleting module: $module_name"
  
  local module_path="$MODULES_PATH/$module_name"
  local api_registry
  api_registry=$(load_api_registry)
  
  # Check dependencies in other modules
  if [ -d "$MODULES_PATH" ]; then
    local dependencies
    dependencies=$(grep -r "import.*$module_name" "$MODULES_PATH" 2>/dev/null || true)
    
    if [ -n "$dependencies" ]; then
      log_warning "Found dependencies on '$module_name':"
      echo "$dependencies"
      
      if [ "$FORCE" = false ]; then
        echo -e "${RED}Other modules depend on '$module_name'.${NC}"
        echo "Are you sure you want to continue? (y/N): "
        read -r confirmation
        if [[ ! $confirmation =~ ^[Yy]$ ]]; then
          log_info "Deletion cancelled"
          exit 0
        fi
      fi
    fi
  fi
  
  # Backup module files
  if [ "$BACKUP_ENABLED" = true ] && [ -d "$module_path" ]; then
    backup_module "$module_path" "$module_name"
  fi
  
  # Delete module files
  if [ "$DRY_RUN" = false ] && [ -d "$module_path" ]; then
    rm -rf "$module_path"
    log_success "Module directory deleted: $module_path"
  fi
  
  # Remove from API registry
  local updated_registry
  updated_registry=$(echo "$api_registry" | jq --arg name "$module_name" '
    del(.module_apis[$name])
  ')
  
  if [ "$DRY_RUN" = false ]; then
    save_api_registry "$updated_registry" "deleted module $module_name"
  fi
  
  log_success "Module '$module_name' deleted successfully"
}

# Validate module
validate_module() {
  local module_name="$1"
  
  if [ -z "$module_name" ]; then
    log_error "Module name is required for validate action"
    exit 1
  fi
  
  log_info "Validating module: $module_name"
  
  if [ "$DRY_RUN" = false ]; then
    # Run validation script
    log_info "Running API registry validation..."
    if node "$VALIDATION_SCRIPT"; then
      log_success "API registry validation passed"
    else
      log_error "API registry validation failed"
      return 1
    fi
    
    # Check module structure
    local module_path="$MODULES_PATH/$module_name"
    if [ -d "$module_path" ]; then
      log_info "Checking module structure..."
      
      local required_files=(
        "src/index.ts"
        "README.md"
        "__test__"
        "constants"
        "interfaces"
        "types"
      )
      
      local missing_files=()
      for file in "${required_files[@]}"; do
        if [ ! -e "$module_path/$file" ]; then
          missing_files+=("$file")
        fi
      done
      
      if [ ${#missing_files[@]} -eq 0 ]; then
        log_success "Module structure validation passed"
      else
        log_error "Module structure validation failed - missing files: ${missing_files[*]}"
        return 1
      fi
    else
      log_warning "Module directory not found: $module_path"
    fi
  fi
  
  log_success "Module '$module_name' validation completed"
}

# Sync modules with API registry
sync_modules() {
  log_info "Syncing modules with API registry..."
  
  local api_registry
  api_registry=$(load_api_registry)
  local updated_registry="$api_registry"
  
  # Find modules in filesystem but not in registry
  if [ -d "$MODULES_PATH" ]; then
    local file_modules
    file_modules=$(find "$MODULES_PATH" -maxdepth 1 -type d -name "[!_]*" -exec basename {} \; | sort)
    
    local newly_registered=()
    
    for file_module in $file_modules; do
      local src_path="$MODULES_PATH/$file_module/src"
      
      # Check if it's a valid module (has TypeScript files)
      if [ -d "$src_path" ]; then
        local has_ts_files
        has_ts_files=$(find "$src_path" -name "*.ts" -not -name "*.d.ts" | head -1)
        
        if [ -n "$has_ts_files" ]; then
          # Check if already in registry
          if ! echo "$api_registry" | jq -e ".module_apis[\"$file_module\"]" > /dev/null; then
            log_info "Registering new module: $file_module"
            
            # Generate basic API registry entry
            updated_registry=$(echo "$updated_registry" | jq --arg name "$file_module" '
              .module_apis[$name] = {
                "module": {
                  "name": $name,
                  "description": "Auto-generated module description",
                  "version": "1.0.0",
                  "basePath": ("/api/" + ($name | ascii_downcase))
                },
                "endpoints": [
                  {
                    "name": "initialize",
                    "description": "Initialize the module",
                    "method": "POST",
                    "path": "/initialize",
                    "parameters": [],
                    "returnType": "Promise<void>",
                    "access": "public"
                  },
                  {
                    "name": "destroy",
                    "description": "Clean up the module",
                    "method": "POST",
                    "path": "/destroy",
                    "parameters": [],
                    "returnType": "Promise<void>",
                    "access": "public"
                  }
                ]
              }
            ')
            
            newly_registered+=("$file_module")
          fi
        fi
      fi
    done
    
    if [ ${#newly_registered[@]} -gt 0 ]; then
      if [ "$DRY_RUN" = false ]; then
        save_api_registry "$updated_registry" "synced ${#newly_registered[@]} new modules"
        log_success "Registered ${#newly_registered[@]} new modules: ${newly_registered[*]}"
      else
        log_info "Would register ${#newly_registered[@]} new modules: ${newly_registered[*]}"
      fi
    else
      log_info "No new modules to register"
    fi
  fi
  
  # Save updated registry if changes were made
  if [ "$DRY_RUN" = false ] && [ "$updated_registry" != "$api_registry" ]; then
    save_api_registry "$updated_registry" "module sync operation"
  fi
  
  log_success "Module sync completed"
}

# Check if jq is available
check_jq() {
  if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed"
    log_info "Install jq with:"
    echo "  macOS: brew install jq"
    echo "  Ubuntu: sudo apt-get install jq"
    echo "  Other systems: https://stedolan.github.io/jq/download/"
    exit 1
  fi
}

# Help function for invalid actions
show_usage() {
  echo "Usage: $0 <action> [options]"
  echo ""
  echo "Actions: create, list, inspect, update, delete, validate, sync, help"
  echo "Use '$0 help' for more information"
  exit 1
}

# Main function
main() {
  echo ""
  echo -e "${PURPLE}🔧 RCC Module Management Tool${NC}"
  echo -e "${PURPLE}=========================================${NC}"
  echo ""
  
  # Check for required tools
  check_jq
  check_prerequisites
  
  # Handle different actions
  case $ACTION in
    "create")
      create_module "$MODULE_NAME"
      ;;
    "list")
      list_modules
      ;;
    "inspect")
      inspect_module "$MODULE_NAME"
      ;;
    "update")
      update_module "$MODULE_NAME"
      ;;
    "delete")
      delete_module "$MODULE_NAME"
      ;;
    "validate")
      validate_module "$MODULE_NAME"
      ;;
    "sync")
      sync_modules
      ;;
    "help")
      show_help
      ;;
    "")
      show_usage
      ;;
    *)
      log_error "Unknown action: $ACTION"
      show_usage
      ;;
  esac
}

# Run main function with error handling
if ! main "$@"; then
  log_error "Module management tool failed"
  exit 1
fi