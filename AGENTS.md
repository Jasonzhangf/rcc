# Repository Guidelines

## Project Structure & Module Organization

The RCC framework follows a modular TypeScript architecture:

- `src/` - Core source code organized by functionality
  - `cli/` - CLI entry point and main commands
  - `commands/` - Individual command implementations
  - `index.ts` - Main module exports
  - `types/` - TypeScript type definitions
- `sharedmodule/` - Shared modules with common functionality
  - `pipeline/` - Pipeline processing components
  - `server/` - Server infrastructure
  - `basemodule/` - Base module abstractions
  - `debug-center/` - Debugging utilities
  - `errorhandling/` - Error management
- `config/` - Configuration files and settings
- `docs/` - Project documentation
- `scripts/` - Build and utility scripts
- `package/` - Packaged modules

## Build, Test, and Development Commands

Key development commands:

- `npm run build` - Clean and build the entire project (CJS + ESM + types)
- `npm run dev` - Start TypeScript compiler in watch mode
- `npm test` - Run Jest tests with pass-through for empty test suites
- `npm run test:coverage` - Run tests with coverage reports
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint TypeScript source files
- `npm run lint:fix` - Fix linting issues automatically
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm run validate` - Run type checking and tests together

Module management commands:
- `npm run module:list` - List available modules
- `npm run module:create` - Create a new module
- `npm run module:enable` - Enable a module
- `npm run module:disable` - Disable a module

## Coding Style & Naming Conventions

**TypeScript Configuration:**
- Target: ES2020
- Strict mode enabled
- Module system: ES2020
- Decorators enabled
- Source maps enabled

**Style Guidelines:**
- Indentation: 2 spaces (no tabs)
- Quotes: Single quotes
- Semicolons: Required
- Line length: 100 characters maximum
- Trailing commas: ES5 style

**Naming Conventions:**
- Classes: PascalCase (e.g., `DebugCenter`)
- Interfaces: PascalCase with `I` prefix (e.g., `IConfig`)
- Functions: camelCase (e.g., `loadModule`)
- Variables: camelCase (e.g., `moduleConfig`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- Files: kebab-case for directories, PascalCase for TypeScript files

**Tools Used:**
- ESLint with TypeScript plugin
- Prettier for code formatting
- TypeScript for type checking

## Testing Guidelines

**Testing Framework:**
- Jest with ts-jest preset
- Test environment: Node.js
- Test timeout: 30 seconds

**Test Organization:**
- Test files: `*.test.ts` suffix
- Test directories: `__test__/` folders
- Test location: Co-located with source code in `sharedmodule/*/` directories

**Test Coverage Requirements:**
- Branches: 90%
- Functions: 92%
- Lines: 90%
- Statements: 90%

**Test Naming:**
- Describe blocks: Describe the component/system being tested
- Test names: Should describe the behavior being tested
- Use `it()` or `test()` for individual test cases

## Commit & Pull Request Guidelines

**Commit Message Conventions:**
- Use conventional commit format: `<type>: <description>`
- Common types: `feat`, `fix`, `build`, `docs`, `style`, `refactor`, `test`
- Examples:
  - `feat: Add complete RCC system implementation`
  - `fix: resolve rcc-server build system root cause`
  - `build: Update dist files for ESM-only release`

**Pull Request Requirements:**
- Include clear description of changes
- Link to related issues when applicable
- Ensure all tests pass
- Run `npm run validate` before submission
- Update documentation if applicable
- Follow code style guidelines

**Pre-commit Checklist:**
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Changes tested locally

## Agent-Specific Instructions

When working with this repository:
- Respect the modular architecture - keep changes scoped to specific modules
- Follow TypeScript strict mode requirements
- Maintain test coverage standards
- Use the provided module management commands for module operations
- Keep configuration changes in the `config/` directory
- Document new features in the appropriate `docs/` sections

**Development Environment:**
- Node.js >= 16.0.0
- npm >= 8.0.0
- TypeScript 5.4.5
