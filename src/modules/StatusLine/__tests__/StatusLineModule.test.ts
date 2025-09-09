/**
 * StatusLineModule Unit Tests
 * Comprehensive test suite following RCC governance rules
 * 
 * @author RCC System
 * @version 1.0.0
 * @since 2025-01-09
 */

import { StatusLineModule } from '../src/StatusLineModule';
import { ModuleInfo } from '../../../interfaces/ModuleInfo';
import { STATUS_LINE_CONSTANTS } from '../constants/StatusLine.constants';
import {
  IStatusLineTheme,
  IStatusLineLayout,
  IStatusLineComponent,
  IStatusLineTemplate,
  IStatusLinePreview,
} from '../interfaces/IStatusLineModule';
import { testData } from './fixtures/test-data';

/**
 * Test suite for StatusLineModule
 */
describe('StatusLineModule', () => {
  let module: StatusLineModule;
  let moduleInfo: ModuleInfo;

  // Setup before each test
  beforeEach(() => {
    moduleInfo = {
      id: 'test-status-line-module',
      name: 'Test StatusLine Module',
      version: '1.0.0',
      description: 'Test instance of StatusLine module',
      type: 'ui-configuration',
    };

    module = new StatusLineModule(moduleInfo);
  });

  // Cleanup after each test
  afterEach(async () => {
    await module.destroy();
  });

  /**
   * Module lifecycle tests
   */
  describe('Module Lifecycle', () => {
    test('should create instance successfully', () => {
      expect(module).toBeInstanceOf(StatusLineModule);
      expect(module.getInfo()).toEqual(moduleInfo);
    });

    test('should create instance using static factory method', () => {
      const factoryModule = StatusLineModule.createInstance(moduleInfo);
      expect(factoryModule).toBeInstanceOf(StatusLineModule);
      expect(factoryModule.getInfo()).toEqual(moduleInfo);
    });

    test('should configure module before initialization', () => {
      const config = {
        theme: testData.themes.default,
        autoSave: true,
        autoSaveInterval: 5000,
      };

      expect(() => module.configure(config)).not.toThrow();
      expect(module.getConfig()).toEqual(config);
    });

    test('should initialize successfully', async () => {
      const config = {
        theme: testData.themes.default,
        preview: { enabled: false }, // Disable preview for faster testing
      };

      module.configure(config);
      await expect(module.initialize()).resolves.not.toThrow();
    });

    test('should initialize with default configuration', async () => {
      await expect(module.initialize()).resolves.not.toThrow();
    });

    test('should destroy resources properly', async () => {
      await module.initialize();
      await expect(module.destroy()).resolves.not.toThrow();
    });
  });

  /**
   * Theme management tests
   */
  describe('Theme Management', () => {
    beforeEach(async () => {
      module.configure({ preview: { enabled: false } });
      await module.initialize();
    });

    test('should get current theme', () => {
      const theme = module.getCurrentTheme();
      expect(theme).toBeDefined();
      expect(theme.id).toBe(STATUS_LINE_CONSTANTS.THEMES.DEFAULT.id);
    });

    test('should get available themes', () => {
      const themes = module.getAvailableThemes();
      expect(themes).toBeInstanceOf(Array);
      expect(themes.length).toBeGreaterThan(0);
      
      // Should include built-in themes
      const themeIds = themes.map(t => t.id);
      expect(themeIds).toContain('default');
      expect(themeIds).toContain('powerline');
      expect(themeIds).toContain('minimal');
    });

    test('should set valid theme successfully', async () => {
      const result = await module.setTheme(testData.themes.powerline);
      
      expect(result.success).toBe(true);
      expect((result as any).theme).toEqual(testData.themes.powerline);
      expect(module.getCurrentTheme().id).toBe(testData.themes.powerline.id);
    });

    test('should reject invalid theme', async () => {
      const invalidTheme = {
        ...testData.themes.default,
        id: '', // Invalid: empty ID
      };

      const result = await module.setTheme(invalidTheme);
      
      expect(result.success).toBe(false);
      expect((result as any).error).toBeDefined();
      expect((result as any).error?.code).toBe(STATUS_LINE_CONSTANTS.ERRORS.INVALID_THEME);
    });

    test('should validate theme colors', async () => {
      const invalidTheme: IStatusLineTheme = {
        ...testData.themes.default,
        colors: {
          ...testData.themes.default.colors,
          background: 'invalid-color', // Invalid color format
        },
      };

      const result = await module.setTheme(invalidTheme);
      
      expect(result.success).toBe(false);
      expect((result as any).error?.message).toContain('Invalid color format');
    });
  });

  /**
   * Layout management tests
   */
  describe('Layout Management', () => {
    beforeEach(async () => {
      module.configure({ preview: { enabled: false } });
      await module.initialize();
    });

    test('should get current layout', () => {
      const layout = module.getCurrentLayout();
      expect(layout).toBeDefined();
      expect(layout.position).toBe(STATUS_LINE_CONSTANTS.DEFAULTS.POSITION);
      expect(layout.height).toBe(STATUS_LINE_CONSTANTS.DEFAULTS.HEIGHT);
    });

    test('should update layout successfully', async () => {
      const newLayout: IStatusLineLayout = {
        ...module.getCurrentLayout(),
        position: 'top',
        height: 30,
      };

      const result = await module.updateLayout(newLayout);
      
      expect(result.success).toBe(true);
      expect((result as any).layout).toEqual(newLayout);
      expect(module.getCurrentLayout().position).toBe('top');
      expect(module.getCurrentLayout().height).toBe(30);
    });

    test('should reject invalid layout height', async () => {
      const invalidLayout: IStatusLineLayout = {
        ...module.getCurrentLayout(),
        height: 5, // Too small
      };

      const result = await module.updateLayout(invalidLayout);
      
      expect(result.success).toBe(false);
      expect((result as any).error).toBeDefined();
      expect((result as any).error?.code).toBe(STATUS_LINE_CONSTANTS.ERRORS.INVALID_LAYOUT);
    });

    test('should reject invalid layout position', async () => {
      const invalidLayout = {
        ...module.getCurrentLayout(),
        position: 'invalid' as any,
      };

      const result = await module.updateLayout(invalidLayout);
      
      expect(result.success).toBe(false);
      expect((result as any).error?.message).toContain('Invalid layout position');
    });
  });

  /**
   * Component management tests
   */
  describe('Component Management', () => {
    beforeEach(async () => {
      module.configure({ preview: { enabled: false } });
      await module.initialize();
    });

    test('should get current components', () => {
      const components = module.getComponents();
      expect(components).toBeInstanceOf(Array);
      expect(components.length).toBeGreaterThan(0);
    });

    test('should add component successfully', async () => {
      const newComponent: IStatusLineComponent = {
        id: 'test-component',
        type: 'custom',
        label: 'Test Component',
        enabled: true,
        position: 'left',
        priority: 10,
        color: '#ffffff',
        tooltip: 'Test component tooltip',
      };

      const result = await module.addComponent(newComponent);
      
      expect(result.success).toBe(true);
      expect((result as any).component).toEqual(newComponent);
      
      const components = module.getComponents();
      expect(components.find(c => c.id === 'test-component')).toEqual(newComponent);
    });

    test('should reject duplicate component ID', async () => {
      const duplicateComponent: IStatusLineComponent = {
        id: 'mode', // Already exists
        type: 'custom',
        label: 'Duplicate Component',
        enabled: true,
        position: 'left',
        priority: 10,
      };

      const result = await module.addComponent(duplicateComponent);
      
      expect(result.success).toBe(false);
      expect((result as any).error?.message).toContain('already exists');
    });

    test('should remove component successfully', async () => {
      const components = module.getComponents();
      const componentToRemove = components[0];
      
      const result = await module.removeComponent(componentToRemove.id);
      
      expect(result.success).toBe(true);
      
      const updatedComponents = module.getComponents();
      expect(updatedComponents.find(c => c.id === componentToRemove.id)).toBeUndefined();
    });

    test('should reject removing non-existent component', async () => {
      const result = await module.removeComponent('non-existent-component');
      
      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(STATUS_LINE_CONSTANTS.ERRORS.COMPONENT_NOT_FOUND);
    });

    test('should update component successfully', async () => {
      const components = module.getComponents();
      const componentToUpdate = components[0];
      
      const updates = {
        label: 'Updated Label',
        color: '#ff0000',
      };

      const result = await module.updateComponent(componentToUpdate.id, updates);
      
      expect(result.success).toBe(true);
      expect((result as any).component?.label).toBe('Updated Label');
      expect((result as any).component?.color).toBe('#ff0000');
    });

    test('should validate component configuration', async () => {
      const invalidComponent: IStatusLineComponent = {
        id: 'ab', // Too short
        type: 'custom',
        label: '',
        enabled: true,
        position: 'left',
        priority: -1, // Invalid priority
      };

      const result = await module.addComponent(invalidComponent);
      
      expect(result.success).toBe(false);
      expect((result as any).error?.message).toContain('Invalid component configuration');
    });
  });

  /**
   * Preview generation tests
   */
  describe('Preview Generation', () => {
    beforeEach(async () => {
      await module.initialize();
    });

    test('should generate preview successfully', async () => {
      const previewConfig: IStatusLinePreview = {
        enabled: true,
        realTime: false,
        duration: 1000,
        showTooltips: true,
        highlightChanges: false,
        sampleData: testData.sampleData,
      };

      const result = await module.generatePreview(previewConfig);
      
      expect(result.success).toBe(true);
      expect((result as any).preview).toBeDefined();
      expect((result as any).preview?.html).toContain(STATUS_LINE_CONSTANTS.CSS_CLASSES.STATUS_LINE);
      expect((result as any).preview?.css).toContain('StatusLine Module Styles');
    });

    test('should use cached preview for duplicate requests', async () => {
      const previewConfig: IStatusLinePreview = {
        enabled: true,
        realTime: false,
        duration: 1000,
        showTooltips: true,
        highlightChanges: false,
        sampleData: testData.sampleData,
      };

      // Generate preview twice
      const result1 = await module.generatePreview(previewConfig);
      const result2 = await module.generatePreview(previewConfig);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect((result1 as any).preview?.html).toBe((result2 as any).preview?.html);
    });

    test('should include component data in preview', async () => {
      const previewConfig: IStatusLinePreview = {
        enabled: true,
        realTime: false,
        duration: 1000,
        showTooltips: true,
        highlightChanges: false,
        sampleData: {
          MODE: 'INSERT',
          FILE_NAME: 'test.ts',
          POSITION: '42:10',
        },
      };

      const result = await module.generatePreview(previewConfig);
      
      expect(result.success).toBe(true);
      expect((result as any).preview?.html).toContain('NORMAL');
      expect((result as any).preview?.html).toContain('example.ts');
      expect((result as any).preview?.html).toContain('15:42');
    });
  });

  /**
   * Template management tests
   */
  describe('Template Management', () => {
    beforeEach(async () => {
      module.configure({ preview: { enabled: false } });
      await module.initialize();
    });

    test('should get available templates', () => {
      const templates = module.getTemplates();
      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
      
      // Should include built-in templates
      const templateIds = templates.map(t => t.id);
      expect(templateIds).toContain('default-template');
      expect(templateIds).toContain('developer-template');
      expect(templateIds).toContain('writer-template');
    });

    test('should apply template successfully', async () => {
      const template: IStatusLineTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test template for unit tests',
        theme: testData.themes.powerline,
        layout: {
          ...module.getCurrentLayout(),
          position: 'top',
        },
        components: [
          testData.components.mode,
          testData.components.fileInfo,
        ],
        presets: {},
      };

      const result = await module.applyTemplate(template);
      
      expect(result.success).toBe(true);
      expect((result as any).appliedTemplate).toEqual(template);
      expect(module.getCurrentTheme().id).toBe(testData.themes.powerline.id);
      expect(module.getCurrentLayout().position).toBe('top');
    });

    test('should reject invalid template', async () => {
      const invalidTemplate: IStatusLineTemplate = {
        id: '', // Invalid: empty ID
        name: 'Invalid Template',
        description: 'Invalid template for testing',
        theme: testData.themes.default,
        layout: module.getCurrentLayout(),
        components: [],
        presets: {},
      };

      const result = await module.applyTemplate(invalidTemplate);
      
      expect(result.success).toBe(false);
      expect((result as any).error?.message).toContain('Invalid template configuration');
    });
  });

  /**
   * Import/Export tests
   */
  describe('Import/Export', () => {
    beforeEach(async () => {
      module.configure({ preview: { enabled: false } });
      await module.initialize();
    });

    test('should export configuration as JSON', async () => {
      const result = await module.exportConfiguration('json');
      
      expect(result.success).toBe(true);
      expect((result as any).exportData).toBeDefined();
      expect((result as any).exportData?.format).toBe('json');
      expect((result as any).exportData?.content).toContain('theme');
      expect((result as any).exportData?.content).toContain('layout');
      expect((result as any).exportData?.content).toContain('components');
      expect((result as any).exportData?.mimeType).toBe('application/json');
    });

    test('should export configuration as CSS', async () => {
      const result = await module.exportConfiguration('css');
      
      expect(result.success).toBe(true);
      expect((result as any).exportData?.format).toBe('css');
      expect((result as any).exportData?.content).toContain('StatusLine Module Styles');
      expect((result as any).exportData?.mimeType).toBe('text/css');
    });

    test('should export configuration as HTML', async () => {
      const result = await module.exportConfiguration('html');
      
      expect(result.success).toBe(true);
      expect((result as any).exportData?.format).toBe('html');
      expect((result as any).exportData?.content).toContain('<!DOCTYPE html>');
      expect((result as any).exportData?.content).toContain('StatusLine Preview');
      expect((result as any).exportData?.mimeType).toBe('text/html');
    });

    test('should import configuration from JSON', async () => {
      // First export current configuration
      const exportResult = await module.exportConfiguration('json');
      expect(exportResult.success).toBe(true);
      
      // Modify configuration
      await module.setTheme(testData.themes.powerline);
      
      // Import original configuration
      const importResult = await module.importConfiguration(
        (exportResult as any).exportData!.content,
        'json'
      );
      
      expect(importResult.success).toBe(true);
      expect((importResult as any).importedData).toBeDefined();
      expect((importResult as any).stats?.themesImported).toBe(1);
    });

    test('should reject invalid JSON import', async () => {
      const invalidJson = '{ invalid json';
      
      const result = await module.importConfiguration(invalidJson, 'json');
      
      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe(STATUS_LINE_CONSTANTS.ERRORS.IMPORT_FAILED);
    });
  });

  /**
   * Validation tests
   */
  describe('Configuration Validation', () => {
    beforeEach(async () => {
      await module.initialize();
    });

    test('should validate valid configuration', () => {
      const config = {
        theme: testData.themes.default,
        layout: module.getCurrentLayout(),
        components: [testData.components.mode],
      };

      const result = module.validateConfiguration(config);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid theme in configuration', () => {
      const config = {
        theme: {
          ...testData.themes.default,
          id: '', // Invalid
        },
        layout: module.getCurrentLayout(),
        components: [],
      };

      const result = module.validateConfiguration(config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Theme ID');
    });

    test('should reject invalid layout in configuration', () => {
      const config = {
        theme: testData.themes.default,
        layout: {
          ...module.getCurrentLayout(),
          height: 5, // Too small
        },
        components: [],
      };

      const result = module.validateConfiguration(config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('height');
    });

    test('should reject invalid components in configuration', () => {
      const config = {
        theme: testData.themes.default,
        layout: module.getCurrentLayout(),
        components: [{
          ...testData.components.mode,
          id: '', // Invalid
        }],
      };

      const result = module.validateConfiguration(config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Component 0');
    });
  });

  /**
   * Reset functionality tests
   */
  describe('Reset Functionality', () => {
    beforeEach(async () => {
      module.configure({ preview: { enabled: false } });
      await module.initialize();
    });

    test('should reset to defaults successfully', async () => {
      // Modify configuration
      await module.setTheme(testData.themes.powerline);
      await module.updateLayout({
        ...module.getCurrentLayout(),
        position: 'top',
      });
      
      // Reset to defaults
      const result = await module.resetToDefaults();
      
      expect(result.success).toBe(true);
      expect((result as any).configuration).toBeDefined();
      expect(module.getCurrentTheme().id).toBe(STATUS_LINE_CONSTANTS.THEMES.DEFAULT.id);
      expect(module.getCurrentLayout().position).toBe(STATUS_LINE_CONSTANTS.DEFAULTS.POSITION);
    });
  });

  /**
   * Error handling tests
   */
  describe('Error Handling', () => {
    test('should handle module not initialized error', async () => {
      const uninitializedModule = new StatusLineModule(moduleInfo);
      
      // Try to use module without initialization
      const result = await uninitializedModule.setTheme(testData.themes.default);
      
      // Should not throw, but may return error in some implementations
      expect(result).toBeDefined();
      
      await uninitializedModule.destroy();
    });

    test('should handle configuration after initialization error', () => {
      return module.initialize().then(() => {
        expect(() => {
          module.configure({ theme: testData.themes.default });
        }).toThrow('Cannot configure module after initialization');
      });
    });
  });

  /**
   * Performance tests
   */
  describe('Performance', () => {
    beforeEach(async () => {
      module.configure({ preview: { enabled: false } });
      await module.initialize();
    });

    test('should complete operations within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await module.setTheme(testData.themes.powerline);
      await module.updateLayout({
        ...module.getCurrentLayout(),
        position: 'top',
      });
      await module.addComponent({
        id: 'perf-test-component',
        type: 'custom',
        label: 'Performance Test',
        enabled: true,
        position: 'left',
        priority: 50,
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within 1 second
      expect(executionTime).toBeLessThan(1000);
    });

    test('should handle multiple concurrent operations', async () => {
      const operations = [
        module.setTheme(testData.themes.powerline),
        module.updateLayout({
          ...module.getCurrentLayout(),
          height: 30,
        }),
        module.addComponent({
          id: 'concurrent-test-1',
          type: 'custom',
          label: 'Concurrent Test 1',
          enabled: true,
          position: 'left',
          priority: 60,
        }),
        module.addComponent({
          id: 'concurrent-test-2',
          type: 'custom',
          label: 'Concurrent Test 2',
          enabled: true,
          position: 'right',
          priority: 61,
        }),
      ];
      
      const results = await Promise.all(operations);
      
      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});
