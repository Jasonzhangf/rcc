# Multi-Key UI Server Modular Refactoring Plan

## Current State
- **File**: `scripts/start-multi-key-ui.js`
- **Size**: 2815 lines 
- **Problem**: Monolithic class with multiple responsibilities

## Target Modular Structure

### 1. Core Server Module (`src/modules/Server/`)
**Responsibility**: HTTP server, routing, request coordination
- `src/modules/Server/src/HttpServer.ts`
- `src/modules/Server/interfaces/IHttpServer.ts`
- Basic HTTP handling, CORS, static file serving
- Route API requests to appropriate modules

### 2. Providers Management Module (`src/modules/ProvidersManager/`)
**Responsibility**: Provider CRUD, testing, configuration
- `src/modules/ProvidersManager/src/ProvidersManager.ts`
- Handle provider creation, update, deletion
- Provider testing and validation
- API key management

### 3. Models Management Module (`src/modules/ModelsManager/`)
**Responsibility**: Model verification, token detection, status management  
- `src/modules/ModelsManager/src/ModelsManager.ts`
- Model verification and testing
- Token limit detection
- Model status management

### 4. Blacklist Management Module (`src/modules/BlacklistManager/`)
**Responsibility**: Model blacklisting with deduplication
- `src/modules/BlacklistManager/src/BlacklistManager.ts`
- Blacklist operations
- Deduplication logic with pool

### 5. Pool Management Module (`src/modules/PoolManager/`)
**Responsibility**: Provider pool operations with deduplication
- `src/modules/PoolManager/src/PoolManager.ts`
- Pool operations
- Deduplication logic with blacklist

### 6. Configuration Management Module (`src/modules/ConfigManager/`)
**Responsibility**: Configuration file operations, backup/restore
- `src/modules/ConfigManager/src/ConfigManager.ts`
- Config read/write/backup
- Configuration validation

### 7. API Router Module (`src/modules/ApiRouter/`)
**Responsibility**: Route API requests to appropriate modules
- `src/modules/ApiRouter/src/ApiRouter.ts`
- Route parsing and delegation
- Unified API response formatting

## Implementation Steps

1. **Create Module Base Structure** - Set up directories following BaseModule pattern
2. **Extract Configuration Module** - Start with simplest module
3. **Extract API Router Module** - Create routing abstraction
4. **Extract Providers Module** - Move provider management logic
5. **Extract Models Module** - Move model management logic  
6. **Extract Blacklist/Pool Modules** - Move specialized logic
7. **Create New Core Server** - Minimal HTTP server coordinating modules
8. **Integration Testing** - Ensure all functionality works
9. **Cleanup** - Remove old monolithic file

## Benefits
- **Single Responsibility**: Each module has one clear purpose
- **Testability**: Each module can be unit tested independently
- **Maintainability**: Changes isolated to relevant modules
- **Reusability**: Modules can be reused in different contexts
- **Scalability**: Easy to add new modules or modify existing ones

## Deduplication Logic Preservation
The critical deduplication logic between blacklist and pool will be preserved in the respective modules with proper inter-module communication.