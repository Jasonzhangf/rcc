# RCC - Routing Control Center

RCC (Routing Control Center) is a modular TypeScript application framework designed for building scalable, secure, and maintainable applications with strict API boundaries and controlled module interactions.

## Overview

This project implements a modular architecture with the following key features:

1. **BaseModule System**: Foundation for all modules with standardized interfaces
2. **Module Registry**: Centralized module management and routing
3. **API Isolation**: Strict control over module interfaces for security
4. **Connection Management**: Input/output interface connections with validation
5. **Development Security**: File creation validation through iFlow CLI hooks

## Architecture

The architecture is built around a base module system that provides:

- **Static Compilation with Dynamic Instantiation**: Modules are statically compiled for type safety but dynamically instantiated through a registry
- **Controlled Module Interactions**: Modules communicate through validated connections
- **Security by Design**: API isolation ensures modules only expose necessary interfaces

### Core Components

1. **BaseModule**: Foundation class for all modules with standardized interfaces
2. **ModuleRegistry**: Singleton for centralized module management
3. **ApiIsolation**: Utility for controlled access to module functionality
4. **Connection Management**: Structured data transfer between modules

### Directory Structure

```
src/
├── core/           # Core module classes (BaseModule, UnderConstruction)
├── modules/        # Specific module implementations (DebugModule, ExampleModule)
├── interfaces/     # Shared interfaces (Connection, ModuleInfo, Validation)
├── registry/       # Module registry implementation
├── utils/          # Utility functions (ApiIsolation)
└── index.ts        # Entry point
```

## Key Features

### Modular Design
- Strict API boundaries between modules
- Dynamic module instantiation through registry
- Standardized module lifecycle management

### Security
- API isolation to prevent unauthorized access
- File creation validation during development (iFlow CLI hooks)
- Controlled data flow between modules

### Development Tools
- Comprehensive logging system with file and console output
- Data flow recording for debugging
- Unit testing framework for module validation

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Building
```bash
npm run build
```

### Running Tests
```bash
npm test
```

## Development Security

This project implements security measures during development through iFlow CLI hooks:

- **File Creation Validation**: Prevents unauthorized file creation
- **Temporary File Management**: Controlled handling of temporary files
- **Audit Trail**: Logging of all file operations for review
- **Policy Enforcement**: Automatic application of security policies

The hooks are configured in `.iflow/settings.json` and use the file validation scripts in `.claude/scripts/` to enforce security policies during development.

For more details, see [iFlow CLI Hooks Documentation](doc/IFLOW_CLI_HOOKS.md).

## Modules

### DebugModule
A comprehensive logging module that supports:
- Console output
- File logging with rotation
- Data flow recording
- Call stack tracing
- Configurable log levels

### ExampleModule
A sample module implementation demonstrating the module structure.

### CommunicationTestModule
A module for testing inter-module communication.

## Message Handling Center

The RCC framework includes a centralized messaging system for inter-module communication. This system provides a flexible and efficient way for modules to communicate with each other.

### Key Features
- **Centralized Message Routing**: All messages pass through a central MessageCenter
- **Multiple Communication Patterns**: Support for one-way messages, request/response, and broadcasting
- **Asynchronous Processing**: Non-blocking message handling for better performance
- **Built-in Error Handling**: Comprehensive error management and propagation
- **Statistics Tracking**: Real-time monitoring of message flow and system performance

### Usage
Modules can send messages using the following methods:
- `sendMessage()`: Send a one-way message (fire and forget)
- `sendRequest()`: Send a request and wait for a response (blocking)
- `sendRequestAsync()`: Send a request with a callback for the response (non-blocking)
- `broadcastMessage()`: Send a message to all registered modules

For detailed information on using the messaging system, see [Module Messaging System](doc/MODULE_MESSAGING_SYSTEM.md).

## Testing

The project includes unit tests for:
- Module communication validation
- Base module functionality
- Debug module features

Run tests with:
```bash
npm test
```

## Documentation

- [Architecture Design](doc/ARCHITECTURE.md)
- [iFlow CLI Hooks](doc/IFLOW_CLI_HOOKS.md)
- [Module API Standards](doc/MODULE_API_STANDARDS.md)
- [Module API Standards Implementation](doc/MODULE_API_STANDARDS_IMPLEMENTATION.md)
- [Module Messaging System](doc/MODULE_MESSAGING_SYSTEM.md)
- [Module Registration Compliance](doc/MODULE_REGISTRATION_COMPLIANCE.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with TypeScript for type safety
- Uses iFlow CLI for development security
- Modular design inspired by microservices architecture