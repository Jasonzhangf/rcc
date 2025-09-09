# StatusLine Module

A comprehensive status line configuration and management module for the RCC system. This module provides advanced theme management, layout configuration, component handling, and real-time preview capabilities following strict RCC governance standards.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Themes](#themes)
- [Components](#components)
- [Templates](#templates)
- [Import/Export](#importexport)
- [Testing](#testing)
- [Performance](#performance)
- [Contributing](#contributing)
- [License](#license)

## Overview

The StatusLine Module is a production-ready implementation that extends the RCC BaseModule architecture to provide comprehensive status line management capabilities. It supports multiple themes, responsive layouts, customizable components, and real-time preview generation.

### Key Capabilities

- **Theme Management**: Built-in themes (Default, Powerline, Minimal) with custom theme support
- **Layout Configuration**: Flexible positioning, responsive design, and component organization
- **Component System**: Drag-and-drop components with custom formatters and validation
- **Real-time Preview**: Live HTML/CSS generation with caching and performance optimization
- **Template System**: Pre-configured templates for different use cases
- **Import/Export**: Configuration export to JSON, YAML, CSS, and HTML formats
- **Type Safety**: Full TypeScript support with comprehensive validation
- **Performance Optimized**: Caching, debouncing, and efficient rendering

## Features

### 🎨 Advanced Theme System

- **Built-in Themes**: Default, Powerline, and Minimal themes
- **Custom Themes**: Create and modify themes with full validation
- **Color Management**: Support for all CSS color formats with validation
- **Typography**: Font family, size, and weight configuration
- **Animations**: Configurable transitions and easing functions
- **Responsive Design**: Automatic adaptation to different screen sizes

### 📱 Flexible Layout Engine

- **Position Control**: Top or bottom positioning with sticky support
- **Responsive Breakpoints**: Mobile, tablet, and desktop configurations
- **Component Sections**: Left, center, and right alignment zones
- **Z-index Management**: Proper layering for complex UIs
- **Width Control**: Fixed width or percentage-based sizing

### 🧩 Dynamic Component System

- **Component Types**: Mode, File, Position, Encoding, FileType, Branch, and Custom
- **Priority System**: Automatic ordering based on priority values
- **Custom Formatters**: JavaScript functions for data transformation
- **Icon Support**: Unicode and emoji icon integration
- **Tooltip System**: Contextual help and information display
- **Validation**: Comprehensive input validation and error handling

### 🔥 Real-time Preview

- **Live Generation**: Instant HTML and CSS generation
- **Performance Caching**: Intelligent caching with automatic cleanup
- **Sample Data**: Configurable test data for preview generation
- **Export Options**: Preview export to standalone HTML files
- **Interactive Mode**: Real-time updates during configuration changes

### 💾 Template Management

- **Pre-built Templates**: Developer, Writer, and Presentation configurations
- **Custom Templates**: Save and share configuration templates
- **Template Validation**: Automatic validation of template configurations
- **Preset System**: Template-specific configuration presets

### 🔄 Import/Export System

- **Multiple Formats**: JSON, YAML, CSS, and HTML export support
- **Configuration Backup**: Full configuration export with metadata
- **Style Export**: Standalone CSS for integration with other systems
- **Preview Export**: Complete HTML preview with embedded styles
- **Import Validation**: Comprehensive validation during import operations

## Architecture

### Class Hierarchy

```
BaseModule
└── StatusLineModule (implements IStatusLineModule)
    ├── Theme Management
    ├── Layout Configuration
    ├── Component Management
    ├── Preview Generation
    ├── Template System
    └── Import/Export
```

### Core Interfaces

- `IStatusLineModule`: Main module interface
- `IStatusLineTheme`: Theme configuration interface
- `IStatusLineLayout`: Layout configuration interface
- `IStatusLineComponent`: Component configuration interface
- `IStatusLineTemplate`: Template configuration interface
- `IStatusLineInput/Output`: Communication interfaces

### Data Flow

```
Input Validation → Processing → State Update → Event Emission → Output Generation
       ↑                                      ↓
Error Handling ←───────────────────────────────── Module Communication
```

## Installation

### Prerequisites

- Node.js 16+ with TypeScript support
- RCC Core system installed and configured
- Compatible module registry implementation

### Setup

```bash
# Install dependencies (handled by RCC system)
npm install

# Build the module
npm run build

# Run tests
npm test

# Run validation
npm run validate:all
```

### Module Registration

```typescript
import { ModuleRegistry } from '../../../registry/ModuleRegistry';
import { StatusLineModule } from './src/StatusLineModule';
import { STATUS_LINE_CONSTANTS } from './constants/StatusLine.constants';

// Register the module type
ModuleRegistry.registerModuleType(
  STATUS_LINE_CONSTANTS.MODULE.TYPE,
  StatusLineModule
);

// Create module instance
const moduleInfo = {
  id: 'status-line-1',
  name: 'Primary Status Line',
  version: '1.0.0',
  description: 'Main status line configuration module',
  type: 'ui-configuration',
};

const statusLineModule = await ModuleRegistry.createModule<StatusLineModule>(
  moduleInfo,
  StatusLineModule
);
```

## Quick Start

### Basic Usage

```typescript
import { StatusLineModule } from './src/StatusLineModule';
import { STATUS_LINE_CONSTANTS } from './constants/StatusLine.constants';

// Create and initialize module
const module = new StatusLineModule({
  id: 'my-status-line',
  name: 'My Status Line',
  version: '1.0.0',
  description: 'Custom status line configuration',
  type: 'ui-configuration',
});

// Configure with custom settings
module.configure({
  theme: STATUS_LINE_CONSTANTS.THEMES.POWERLINE,
  autoSave: true,
  autoSaveInterval: 5000,
});

// Initialize
await module.initialize();

// Set a theme
const result = await module.setTheme(STATUS_LINE_CONSTANTS.THEMES.MINIMAL);
if (result.success) {
  console.log('Theme applied successfully:', result.theme);
}

// Add a custom component
const customComponent = {
  id: 'my-component',
  type: 'custom' as const,
  label: 'My Component',
  enabled: true,
  position: 'right' as const,
  priority: 10,
  color: '#ffffff',
  backgroundColor: '#007acc',
  tooltip: 'My custom component',
};

const addResult = await module.addComponent(customComponent);
if (addResult.success) {
  console.log('Component added:', addResult.component);
}

// Generate preview
const previewResult = await module.generatePreview({
  enabled: true,
  realTime: false,
  duration: 3000,
  showTooltips: true,
  highlightChanges: false,
  sampleData: {
    MODE: 'NORMAL',
    FILE_NAME: 'example.ts',
    POSITION: '42:15',
  },
});

if (previewResult.success) {
  console.log('Preview generated:');
  console.log('HTML:', previewResult.preview?.html);
  console.log('CSS:', previewResult.preview?.css);
}
```

### Using Templates

```typescript
// Get available templates
const templates = module.getTemplates();
console.log('Available templates:', templates.map(t => t.name));

// Apply developer template
const developerTemplate = templates.find(t => t.id === 'developer-template');
if (developerTemplate) {
  const result = await module.applyTemplate(developerTemplate);
  if (result.success) {
    console.log('Developer template applied successfully');
  }
}
```

### Export/Import Configuration

```typescript
// Export configuration as JSON
const exportResult = await module.exportConfiguration('json');
if (exportResult.success) {
  console.log('Configuration exported:');
  console.log('Filename:', exportResult.exportData?.filename);
  console.log('Size:', exportResult.exportData?.size, 'bytes');
  
  // Save to file (pseudo-code)
  // saveToFile(exportResult.exportData.filename, exportResult.exportData.content);
}

// Import configuration
const configData = '{ "theme": { ... }, "layout": { ... } }';
const importResult = await module.importConfiguration(configData, 'json');
if (importResult.success) {
  console.log('Configuration imported:', importResult.stats);
}
```

## API Reference

### Core Methods

#### `configure(config: Record<string, any>): void`

Configures the module with initialization data. Must be called before `initialize()`.

**Parameters:**
- `config`: Configuration object with optional theme, layout, components, and preview settings

**Example:**
```typescript
module.configure({
  theme: STATUS_LINE_CONSTANTS.THEMES.POWERLINE,
  layout: { position: 'top', height: 28 },
  preview: { enabled: true, realTime: true },
  autoSave: true,
  autoSaveInterval: 10000,
});
```

#### `initialize(): Promise<void>`

Initializes the module and validates the configuration.

**Throws:**
- Error if configuration is invalid
- Error if module is already initialized

#### `setTheme(theme: IStatusLineTheme): Promise<IStatusLineOutput>`

Sets the current status line theme with validation.

**Parameters:**
- `theme`: Theme configuration object

**Returns:**
- `IStatusLineOutput` with success status and updated theme

**Example:**
```typescript
const customTheme: IStatusLineTheme = {
  id: 'my-theme',
  name: 'My Custom Theme',
  type: 'custom',
  colors: {
    background: '#2d3748',
    foreground: '#ffffff',
    accent: '#4299e1',
    warning: '#ed8936',
    error: '#f56565',
    success: '#48bb78',
    inactive: '#a0aec0',
  },
  fonts: {
    family: 'JetBrains Mono, monospace',
    size: 13,
    weight: 'normal',
  },
  separators: { left: '', right: '', thin: '|' },
  padding: { horizontal: 10, vertical: 5 },
  borders: { enabled: false, style: 'solid', width: 1, color: '#333' },
  animations: { enabled: true, duration: 250, easing: 'ease-out' },
};

const result = await module.setTheme(customTheme);
```

#### `updateLayout(layout: IStatusLineLayout): Promise<IStatusLineOutput>`

Updates the status line layout configuration.

**Parameters:**
- `layout`: Layout configuration object

**Returns:**
- `IStatusLineOutput` with success status and updated layout

#### `addComponent(component: IStatusLineComponent): Promise<IStatusLineOutput>`

Adds a new component to the status line.

**Parameters:**
- `component`: Component configuration object

**Returns:**
- `IStatusLineOutput` with success status and component details

**Example:**
```typescript
const gitComponent: IStatusLineComponent = {
  id: 'git-status',
  type: 'custom',
  label: 'Git Status',
  enabled: true,
  position: 'left',
  priority: 15,
  color: '#ffffff',
  backgroundColor: '#4a5568',
  icon: '', // Git icon
  tooltip: 'Git repository status',
  formatter: (data) => ` ${data.BRANCH || 'main'} ${data.CHANGES || ''}`,
};

const result = await module.addComponent(gitComponent);
```

#### `removeComponent(componentId: string): Promise<IStatusLineOutput>`

Removes a component from the status line.

**Parameters:**
- `componentId`: ID of the component to remove

**Returns:**
- `IStatusLineOutput` with success status

#### `updateComponent(componentId: string, updates: Partial<IStatusLineComponent>): Promise<IStatusLineOutput>`

Updates an existing component's properties.

**Parameters:**
- `componentId`: ID of the component to update
- `updates`: Partial component object with properties to update

**Returns:**
- `IStatusLineOutput` with success status and updated component

#### `generatePreview(previewConfig: IStatusLinePreview): Promise<IStatusLineOutput>`

Generates a real-time preview of the current configuration.

**Parameters:**
- `previewConfig`: Preview configuration options

**Returns:**
- `IStatusLineOutput` with generated HTML, CSS, and preview data

**Example:**
```typescript
const previewConfig: IStatusLinePreview = {
  enabled: true,
  realTime: true,
  duration: 5000,
  showTooltips: true,
  highlightChanges: true,
  sampleData: {
    MODE: 'INSERT',
    FILE_NAME: 'StatusLineModule.ts',
    FILE_PATH: '/src/modules/StatusLine/src/StatusLineModule.ts',
    POSITION: '542:28',
    ENCODING: 'UTF-8',
    FILE_TYPE: 'TypeScript',
    BRANCH: 'feature/status-line',
    MODIFIED: true,
  },
};

const result = await module.generatePreview(previewConfig);
if (result.success && result.preview) {
  document.body.innerHTML = result.preview.html;
  const style = document.createElement('style');
  style.textContent = result.preview.css;
  document.head.appendChild(style);
}
```

### Template Methods

#### `getTemplates(): IStatusLineTemplate[]`

Returns all available configuration templates.

#### `applyTemplate(template: IStatusLineTemplate): Promise<IStatusLineOutput>`

Applies a configuration template to the status line.

**Parameters:**
- `template`: Template configuration object

**Returns:**
- `IStatusLineOutput` with success status and applied configuration

### Import/Export Methods

#### `exportConfiguration(format: 'json' | 'yaml' | 'css' | 'html'): Promise<IStatusLineOutput>`

Exports the current configuration in the specified format.

**Parameters:**
- `format`: Export format (json, yaml, css, html)

**Returns:**
- `IStatusLineOutput` with export data and metadata

#### `importConfiguration(data: string, format: 'json' | 'yaml'): Promise<IStatusLineOutput>`

Imports configuration from the specified data and format.

**Parameters:**
- `data`: Configuration data string
- `format`: Import format (json, yaml)

**Returns:**
- `IStatusLineOutput` with import results and statistics

### Utility Methods

#### `validateConfiguration(config: any): { isValid: boolean; errors: string[]; warnings: string[]; }`

Validates a configuration object against module rules.

#### `resetToDefaults(): Promise<IStatusLineOutput>`

Resets the module to default configuration.

#### `getCurrentTheme(): IStatusLineTheme`

Returns the current theme configuration.

#### `getCurrentLayout(): IStatusLineLayout`

Returns the current layout configuration.

#### `getComponents(): IStatusLineComponent[]`

Returns all current components.

## Configuration

### Theme Configuration

Themes define the visual appearance of the status line.

```typescript
interface IStatusLineTheme {
  id: string;                    // Unique theme identifier
  name: string;                  // Display name
  type: StatusLineThemeType;     // Theme type (default, powerline, minimal, custom)
  colors: {                      // Color scheme
    background: string;          // Main background color
    foreground: string;          // Text color
    accent: string;              // Accent/highlight color
    warning: string;             // Warning message color
    error: string;               // Error message color
    success: string;             // Success message color
    inactive: string;            // Inactive element color
  };
  fonts: {                       // Typography settings
    family: string;              // Font family
    size: number;                // Font size in pixels
    weight: 'normal' | 'bold';   // Font weight
  };
  separators: {                  // Visual separators
    left: string;                // Left separator character
    right: string;               // Right separator character
    thin: string;                // Thin separator character
  };
  padding: {                     // Spacing configuration
    horizontal: number;          // Horizontal padding
    vertical: number;            // Vertical padding
  };
  borders: {                     // Border configuration
    enabled: boolean;            // Enable/disable borders
    style: 'solid' | 'dashed' | 'dotted'; // Border style
    width: number;               // Border width
    color: string;               // Border color
  };
  animations: {                  // Animation settings
    enabled: boolean;            // Enable/disable animations
    duration: number;            // Animation duration in ms
    easing: string;              // CSS easing function
  };
  metadata?: Record<string, any>; // Additional metadata
}
```

### Layout Configuration

Layouts control the positioning and structure of the status line.

```typescript
interface IStatusLineLayout {
  position: 'top' | 'bottom';    // Status line position
  height: number;                // Height in pixels
  width: '100%' | number;        // Width (percentage or pixels)
  zIndex: number;                // Z-index for layering
  sticky: boolean;               // Fixed positioning
  components: {                  // Component organization
    left: IStatusLineComponent[];    // Left-aligned components
    center: IStatusLineComponent[];  // Center-aligned components
    right: IStatusLineComponent[];   // Right-aligned components
  };
  responsive: {                  // Responsive design settings
    enabled: boolean;            // Enable responsive behavior
    breakpoints: {               // Screen size breakpoints
      mobile: number;            // Mobile breakpoint (px)
      tablet: number;            // Tablet breakpoint (px)
      desktop: number;           // Desktop breakpoint (px)
    };
    hideComponents: string[];    // Components to hide on small screens
  };
  metadata?: Record<string, any>; // Additional metadata
}
```

### Component Configuration

Components are individual elements displayed in the status line.

```typescript
interface IStatusLineComponent {
  id: string;                    // Unique component identifier
  type: StatusLineComponentType; // Component type
  label: string;                 // Display label
  enabled: boolean;              // Enable/disable component
  position: 'left' | 'center' | 'right'; // Alignment position
  priority: number;              // Display priority (lower = first)
  formatter?: (data: any) => string; // Custom data formatter
  color?: string;                // Text color override
  backgroundColor?: string;      // Background color override
  icon?: string;                 // Icon character or unicode
  tooltip?: string;              // Tooltip text
  metadata?: Record<string, any>; // Additional metadata
}
```

### Component Types

- `mode`: Editor mode display (NORMAL, INSERT, VISUAL, etc.)
- `file`: File information (name, path, modified status)
- `position`: Cursor position (line:column)
- `encoding`: File encoding (UTF-8, ASCII, etc.)
- `filetype`: File type/language (TypeScript, Markdown, etc.)
- `branch`: Git branch information
- `custom`: Custom component with user-defined behavior

## Themes

### Built-in Themes

#### Default Theme

A classic blue theme suitable for most environments.

```typescript
const defaultTheme = {
  id: 'default',
  name: 'Default Theme',
  type: 'default',
  colors: {
    background: '#007acc',
    foreground: '#ffffff',
    accent: '#0099ff',
    warning: '#ff9900',
    error: '#ff4444',
    success: '#00cc66',
    inactive: '#666666',
  },
  // ... additional configuration
};
```

#### Powerline Theme

A modern theme with special separator characters for a professional look.

```typescript
const powerlineTheme = {
  id: 'powerline',
  name: 'Powerline Theme',
  type: 'powerline',
  colors: {
    background: '#1e1e1e',
    foreground: '#ffffff',
    accent: '#007acc',
    // ...
  },
  separators: {
    left: '',
    right: '',
    thin: '',
  },
  // ... additional configuration
};
```

#### Minimal Theme

A clean, minimal theme for distraction-free environments.

```typescript
const minimalTheme = {
  id: 'minimal',
  name: 'Minimal Theme',
  type: 'minimal',
  colors: {
    background: '#f8f9fa',
    foreground: '#212529',
    accent: '#6c757d',
    // ...
  },
  animations: {
    enabled: false,
    duration: 0,
    easing: 'none',
  },
  // ... additional configuration
};
```

### Creating Custom Themes

```typescript
const customTheme: IStatusLineTheme = {
  id: 'my-custom-theme',
  name: 'My Custom Theme',
  type: 'custom',
  colors: {
    background: '#2d3748',
    foreground: '#e2e8f0',
    accent: '#4299e1',
    warning: '#ed8936',
    error: '#f56565',
    success: '#48bb78',
    inactive: '#a0aec0',
  },
  fonts: {
    family: 'Fira Code, JetBrains Mono, monospace',
    size: 13,
    weight: 'normal',
  },
  separators: {
    left: '',
    right: '',
    thin: '│',
  },
  padding: {
    horizontal: 12,
    vertical: 6,
  },
  borders: {
    enabled: true,
    style: 'solid',
    width: 1,
    color: '#4a5568',
  },
  animations: {
    enabled: true,
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Apply the custom theme
const result = await module.setTheme(customTheme);
if (result.success) {
  console.log('Custom theme applied successfully');
}
```

## Components

### Built-in Components

#### Mode Component

Displays the current editor mode.

```typescript
const modeComponent: IStatusLineComponent = {
  id: 'mode',
  type: 'mode',
  label: 'Mode',
  enabled: true,
  position: 'left',
  priority: 1,
  color: '#ffffff',
  backgroundColor: '#007acc',
  icon: '⚡',
  tooltip: 'Current editor mode',
};
```

#### File Component

Displays file information.

```typescript
const fileComponent: IStatusLineComponent = {
  id: 'file-info',
  type: 'file',
  label: 'File Info',
  enabled: true,
  position: 'left',
  priority: 2,
  formatter: (data) => {
    const modified = data.MODIFIED ? '*' : '';
    const readonly = data.READONLY ? '🔒' : '';
    return `📄 ${data.FILE_NAME || 'untitled'}${modified}${readonly}`;
  },
  tooltip: 'Current file information',
};
```

### Custom Component Formatters

Components can use custom formatter functions to transform data:

```typescript
const customComponent: IStatusLineComponent = {
  id: 'custom-formatter',
  type: 'custom',
  label: 'Custom',
  enabled: true,
  position: 'right',
  priority: 50,
  formatter: (data) => {
    // Custom formatting logic
    if (data.ERROR_COUNT > 0) {
      return `❌ ${data.ERROR_COUNT} errors`;
    }
    if (data.WARNING_COUNT > 0) {
      return `⚠️ ${data.WARNING_COUNT} warnings`;
    }
    return '✅ No issues';
  },
  tooltip: 'Code quality status',
};
```

### Component Priority System

Components are ordered by priority within their alignment section:

```typescript
// Lower priority numbers appear first
const components = [
  { id: 'first', priority: 1, position: 'left' },   // Appears first
  { id: 'second', priority: 5, position: 'left' },  // Appears second
  { id: 'third', priority: 10, position: 'left' },  // Appears third
];
```

## Templates

### Built-in Templates

#### Developer Template

Optimized for software development with all essential components.

```typescript
const developerTemplate: IStatusLineTemplate = {
  id: 'developer-template',
  name: 'Developer Configuration',
  description: 'Optimized for software development with git integration',
  theme: powerlineTheme,
  layout: defaultLayout,
  components: [
    modeComponent,
    branchComponent,
    fileInfoComponent,
    positionComponent,
    encodingComponent,
    filetypeComponent,
  ],
  presets: {
    showGitStatus: true,
    showFileStats: true,
    enableAnimations: true,
  },
};
```

#### Writer Template

Minimal configuration for writing and documentation.

```typescript
const writerTemplate: IStatusLineTemplate = {
  id: 'writer-template',
  name: 'Writer Configuration',
  description: 'Minimal configuration for writing and documentation',
  theme: minimalTheme,
  layout: defaultLayout,
  components: [
    fileInfoComponent,
    positionComponent,
  ],
  presets: {
    showWordCount: true,
    enableSpellCheck: true,
    hideAdvancedFeatures: true,
  },
};
```

### Creating Custom Templates

```typescript
const customTemplate: IStatusLineTemplate = {
  id: 'my-template',
  name: 'My Custom Template',
  description: 'Custom template for specific workflow',
  theme: customTheme,
  layout: {
    position: 'top',
    height: 30,
    width: '100%',
    zIndex: 1000,
    sticky: true,
    components: { left: [], center: [], right: [] },
    responsive: {
      enabled: true,
      breakpoints: { mobile: 480, tablet: 768, desktop: 1024 },
      hideComponents: ['encoding'],
    },
  },
  components: [
    // Custom component selection
    modeComponent,
    fileInfoComponent,
    customComponent,
  ],
  presets: {
    customSetting1: true,
    customSetting2: 'value',
  },
};

// Apply the template
const result = await module.applyTemplate(customTemplate);
```

## Import/Export

### Export Formats

#### JSON Export

Complete configuration data in JSON format.

```typescript
const jsonResult = await module.exportConfiguration('json');
if (jsonResult.success) {
  const config = JSON.parse(jsonResult.exportData.content);
  console.log('Exported configuration:', config);
}
```

#### CSS Export

Standalone CSS styles for integration with other systems.

```typescript
const cssResult = await module.exportConfiguration('css');
if (cssResult.success) {
  // Save CSS to file or inject into page
  const styleElement = document.createElement('style');
  styleElement.textContent = cssResult.exportData.content;
  document.head.appendChild(styleElement);
}
```

#### HTML Export

Complete HTML preview with embedded styles.

```typescript
const htmlResult = await module.exportConfiguration('html');
if (htmlResult.success) {
  // Save as standalone HTML file
  const blob = new Blob([htmlResult.exportData.content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = htmlResult.exportData.filename;
  a.click();
}
```

### Import Operations

#### JSON Import

```typescript
const configData = `{
  "theme": {
    "id": "imported-theme",
    "name": "Imported Theme",
    "type": "custom",
    "colors": {
      "background": "#2d3748",
      "foreground": "#ffffff"
    }
  },
  "layout": {
    "position": "bottom",
    "height": 26
  },
  "components": [
    {
      "id": "imported-component",
      "type": "custom",
      "label": "Imported",
      "enabled": true,
      "position": "left",
      "priority": 1
    }
  ]
}`;

const importResult = await module.importConfiguration(configData, 'json');
if (importResult.success) {
  console.log('Import statistics:', importResult.stats);
  console.log('Imported data:', importResult.importedData);
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run communication tests only
npm run test:communication

# Run tests with coverage
npm run test:coverage

# Run performance tests
npm run test:performance
```

### Test Categories

#### Unit Tests

Test individual module functionality:

- Module lifecycle (creation, initialization, destruction)
- Theme management (setting, validation, built-in themes)
- Layout configuration (positioning, responsive design)
- Component management (add, remove, update, validation)
- Preview generation (HTML/CSS generation, caching)
- Template system (applying, validation)
- Import/export (all formats, validation)
- Configuration validation
- Error handling

#### Communication Tests

Test inter-module communication:

- Connection management (input/output connections)
- Data transfer (event emission, data reception)
- Handshake protocol (module discovery, capability exchange)
- Error propagation (validation errors, communication failures)
- Concurrent operations (multiple simultaneous requests)

#### Performance Tests

Test performance characteristics:

- Operation timing (theme changes, component updates)
- Concurrent operation handling
- Memory usage (caching, cleanup)
- Large dataset handling (many components, complex themes)

### Test Data

Comprehensive test fixtures are provided in `__tests__/fixtures/test-data.ts`:

```typescript
import { testData } from './__tests__/fixtures/test-data';

// Use predefined test themes
const theme = testData.themes.powerline;

// Use test components
const component = testData.components.mode;

// Use helper functions
const customComponent = testData.helpers.createValidComponent({
  id: 'my-test-component',
  label: 'Test Component',
});
```

## Performance

### Optimization Features

#### Caching System

- **Preview Caching**: Generated HTML/CSS cached with automatic expiration
- **Cache Cleanup**: Automatic removal of expired entries
- **Memory Management**: Configurable cache size limits

```typescript
// Cache configuration constants
const PERFORMANCE = {
  CACHE_EXPIRY: 300000,        // 5 minutes
  MAX_CACHE_SIZE: 50,          // Maximum cached items
  DEBOUNCE_DELAY: 300,         // Input debouncing
  THROTTLE_DELAY: 100,         // Update throttling
};
```

#### Performance Monitoring

- **Execution Time Tracking**: All operations timed and logged
- **Performance Metrics**: Rolling average calculation
- **Operation Counting**: Track operation frequency

```typescript
// Access performance metrics
const metrics = module.getPerformanceMetrics();
console.log('Average execution time:', metrics.averageExecutionTime);
console.log('Total operations:', metrics.operationCount);
```

### Best Practices

#### Efficient Component Management

```typescript
// Batch component operations
const components = [
  component1,
  component2,
  component3,
];

// Add components in batch
const promises = components.map(comp => module.addComponent(comp));
const results = await Promise.all(promises);
```

#### Preview Optimization

```typescript
// Disable real-time preview for bulk operations
module.configure({ preview: { enabled: false } });

// Perform bulk operations
await performBulkOperations();

// Re-enable and generate preview
module.configure({ preview: { enabled: true } });
const preview = await module.generatePreview(previewConfig);
```

#### Memory Management

```typescript
// Regular cleanup for long-running applications
setInterval(() => {
  module.cleanupCache();
}, 300000); // Every 5 minutes

// Proper module destruction
process.on('exit', async () => {
  await module.destroy();
});
```

## Contributing

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd rcc/src/modules/StatusLine
   npm install
   ```

2. **Follow RCC Governance Rules**
   - All code must follow the anti-hardcoding policy
   - 100% test coverage is mandatory
   - Complete documentation required
   - TypeScript strict mode enforced

3. **Validation Commands**
   ```bash
   npm run validate:structure    # Validate directory structure
   npm run validate:constants    # Check for hardcoded values
   npm run validate:tests        # Ensure test coverage
   npm run validate:docs         # Verify documentation
   ```

### Code Guidelines

#### Constants Usage

```typescript
// ✅ CORRECT: Use constants
import { STATUS_LINE_CONSTANTS } from '../constants/StatusLine.constants';
const height = STATUS_LINE_CONSTANTS.DEFAULTS.HEIGHT;

// ❌ INCORRECT: Hardcoded values
const height = 24; // FORBIDDEN
```

#### Error Handling

```typescript
// Use standardized error creation
private createErrorOutput(
  operationId: string,
  errorCode: string,
  message: string,
  details?: any
): IStatusLineErrorOutput {
  return {
    success: false,
    operationId,
    timestamp: Date.now(),
    error: {
      code: errorCode,
      message: getErrorMessage(errorCode) || message,
      details,
      resolution: this.getErrorResolution(errorCode),
    },
  };
}
```

#### Type Safety

```typescript
// Use strict typing
interface StrictInterface {
  requiredField: string;
  optionalField?: number;
}

// Validate inputs
function processInput(input: unknown): StrictInterface {
  if (!isValidInput(input)) {
    throw new Error('Invalid input provided');
  }
  return input as StrictInterface;
}
```

### Testing Requirements

- **Unit Tests**: Test all public methods with edge cases
- **Integration Tests**: Test module interactions
- **Communication Tests**: Test inter-module communication
- **Performance Tests**: Ensure acceptable performance
- **Error Tests**: Test all error conditions

### Documentation Standards

- **JSDoc Comments**: All public methods must have complete JSDoc
- **README Updates**: Update README for new features
- **API Documentation**: Update API reference for changes
- **Examples**: Provide working examples for new functionality

## License

This module is part of the RCC system and follows the project's licensing terms.

---

## Appendix

### Error Codes Reference

| Code | Description | Resolution |
|------|-------------|------------|
| `STATUS_LINE_INVALID_THEME` | Theme configuration is invalid | Check theme properties and color formats |
| `STATUS_LINE_INVALID_LAYOUT` | Layout configuration is invalid | Verify layout dimensions and position |
| `STATUS_LINE_INVALID_COMPONENT` | Component configuration is invalid | Check component ID, type, and position |
| `STATUS_LINE_COMPONENT_NOT_FOUND` | Component ID does not exist | Verify component ID and existence |
| `STATUS_LINE_THEME_NOT_FOUND` | Theme ID does not exist | Check available themes |
| `STATUS_LINE_TEMPLATE_NOT_FOUND` | Template ID does not exist | Verify template availability |
| `STATUS_LINE_EXPORT_FAILED` | Export operation failed | Check export format and data |
| `STATUS_LINE_IMPORT_FAILED` | Import operation failed | Verify import data format and validity |
| `STATUS_LINE_PREVIEW_GENERATION_FAILED` | Preview generation failed | Check configuration and sample data |
| `STATUS_LINE_VALIDATION_FAILED` | Configuration validation failed | Review validation errors |

### Constants Reference

For a complete list of constants, see `constants/StatusLine.constants.ts`:

- **Module Information**: ID, name, version, description
- **Default Values**: Dimensions, colors, timing
- **Built-in Themes**: Default, Powerline, Minimal configurations
- **Built-in Components**: Mode, File, Position, etc.
- **Validation Rules**: Minimum/maximum values, format requirements
- **Error Codes**: All possible error conditions
- **Event Types**: Inter-module communication events
- **Performance Settings**: Caching, debouncing, throttling
- **CSS Classes**: Styling class names
- **Sample Data**: Test data for preview generation

### Migration Guide

When upgrading from previous versions:

1. **Check Breaking Changes**: Review changelog for breaking changes
2. **Update Constants**: Replace any hardcoded values with constants
3. **Validate Configuration**: Run validation on existing configurations
4. **Test Integration**: Verify module communication still works
5. **Update Dependencies**: Ensure compatible versions of dependencies

### Troubleshooting

#### Common Issues

1. **Module Not Initializing**
   - Check configuration validity
   - Verify all required dependencies
   - Review error logs for specific issues

2. **Theme Not Applying**
   - Validate theme configuration
   - Check color format compliance
   - Verify theme ID uniqueness

3. **Components Not Displaying**
   - Check component enabled status
   - Verify component position and priority
   - Review layout configuration

4. **Preview Generation Failing**
   - Validate sample data format
   - Check theme and layout validity
   - Review browser console for errors

5. **Performance Issues**
   - Enable caching for preview generation
   - Reduce component count if excessive
   - Check for memory leaks in custom formatters

#### Debug Mode

```typescript
// Enable debug logging
module.configure({
  debug: true,
  logLevel: 'verbose',
});

// Monitor performance
const startTime = performance.now();
await module.someOperation();
const endTime = performance.now();
console.log(`Operation took ${endTime - startTime} milliseconds`);
```

For additional support, consult the RCC system documentation or file an issue in the project repository.
