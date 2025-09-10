/**
 * Web UI Automation Tests
 * 
 * Automated tests for Web UI functionality using DOM manipulation and event simulation.
 * These tests verify user interactions, form handling, and UI component behavior.
 */

import { ConfigurationCenterUI } from '../src/webui/index';
import { ConfigService } from '../src/webui/services/ConfigService';
import { ParserService } from '../src/webui/services/ParserService';
import { StorageService } from '../src/webui/services/StorageService';
import { UIConfig } from '../src/webui/types/ui.types';

// Mock DOM environment for automation tests
describe('Web UI Automation Tests', () => {
  let mockContainer: HTMLElement;
  let configUI: ConfigurationCenterUI;
  let configService: ConfigService;
  let parserService: ParserService;
  let storageService: StorageService;

  beforeEach(() => {
    // Create mock container element
    mockContainer = document.createElement('div');
    mockContainer.id = 'automation-test-container';
    document.body.appendChild(mockContainer);

    // Reset singleton instance
    (ConfigurationCenterUI as any).instance = null;

    // Create service instances
    configService = new ConfigService();
    parserService = new ParserService();
    storageService = new StorageService();
  });

  afterEach(async () => {
    // Clean up DOM
    if (mockContainer && mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
    
    // Destroy UI instance if exists
    if (configUI) {
      await configUI.destroy();
    }
  });

  describe('Form Interaction Automation', () => {
    test('should handle form submission and validation', async () => {
      configUI = ConfigurationCenterUI.getInstance();
      
      const options: UIConfig = {
        containerId: 'automation-test-container',
        theme: 'light',
        defaultView: 'generator'
      };

      await configUI.initialize(options);

      // Create a test form
      const testForm = document.createElement('form');
      testForm.id = 'test-config-form';
      testForm.innerHTML = `
        <div class="form-group">
          <label for="config-name">Configuration Name</label>
          <input type="text" id="config-name" name="name" required>
        </div>
        <div class="form-group">
          <label for="config-description">Description</label>
          <textarea id="config-description" name="description"></textarea>
        </div>
        <div class="form-group">
          <label for="config-version">Version</label>
          <input type="text" id="config-version" name="version" value="1.0.0">
        </div>
        <button type="submit">Save Configuration</button>
      `;

      const mainContent = mockContainer.querySelector('.main-content');
      if (mainContent) {
        mainContent.appendChild(testForm);
      }

      // Fill form with valid data
      const nameInput = document.getElementById('config-name') as HTMLInputElement;
      const descriptionInput = document.getElementById('config-description') as HTMLTextAreaElement;
      const versionInput = document.getElementById('config-version') as HTMLInputElement;

      nameInput.value = 'test-automation-config';
      descriptionInput.value = 'Test configuration for automation';
      versionInput.value = '2.0.0';

      // Simulate form submission
      let formSubmitted = false;
      testForm.addEventListener('submit', (e) => {
        e.preventDefault();
        formSubmitted = true;
        
        // Verify form data
        expect(nameInput.value).toBe('test-automation-config');
        expect(descriptionInput.value).toBe('Test configuration for automation');
        expect(versionInput.value).toBe('2.0.0');
      });

      testForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      
      expect(formSubmitted).toBe(true);
    });

    test('should handle form validation errors', async () => {
      configUI = ConfigurationCenterUI.getInstance();
      
      const options: UIConfig = {
        containerId: 'automation-test-container',
        theme: 'light'
      };

      await configUI.initialize(options);

      // Create a test form with validation
      const testForm = document.createElement('form');
      testForm.id = 'validation-test-form';
      testForm.innerHTML = `
        <div class="form-group">
          <label for="required-field">Required Field *</label>
          <input type="text" id="required-field" name="required" required>
          <span class="error-message" style="display: none;">This field is required</span>
        </div>
        <div class="form-group">
          <label for="email-field">Email</label>
          <input type="email" id="email-field" name="email">
          <span class="error-message" style="display: none;">Please enter a valid email</span>
        </div>
        <button type="submit">Submit</button>
      `;

      const mainContent = mockContainer.querySelector('.main-content');
      if (mainContent) {
        mainContent.appendChild(testForm);
      }

      const requiredField = document.getElementById('required-field') as HTMLInputElement;
      const emailField = document.getElementById('email-field') as HTMLInputElement;
      const submitButton = testForm.querySelector('button') as HTMLButtonElement;

      // Test submission with empty required field
      let validationTriggered = false;
      testForm.addEventListener('submit', (e) => {
        e.preventDefault();
        validationTriggered = true;
        
        // Show validation errors
        if (!requiredField.value) {
          const errorMessage = requiredField.nextElementSibling as HTMLElement;
          errorMessage.style.display = 'block';
        }
        
        if (emailField.value && !emailField.value.includes('@')) {
          const errorMessage = emailField.nextElementSibling as HTMLElement;
          errorMessage.style.display = 'block';
        }
      });

      submitButton.click();
      
      expect(validationTriggered).toBe(true);
      
      const requiredError = requiredField.nextElementSibling as HTMLElement;
      expect(requiredError.style.display).toBe('block');

      // Test with invalid email
      requiredField.value = 'test';
      emailField.value = 'invalid-email';
      
      submitButton.click();
      
      const emailError = emailField.nextElementSibling as HTMLElement;
      expect(emailError.style.display).toBe('block');

      // Test with valid data
      emailField.value = 'test@example.com';
      
      submitButton.click();
      
      expect(requiredError.style.display).toBe('none');
      expect(emailError.style.display).toBe('none');
    });
  });

  describe('File Upload Automation', () => {
    test('should handle file upload and processing', async () => {
      configUI = ConfigurationCenterUI.getInstance();
      
      const options: UIConfig = {
        containerId: 'automation-test-container',
        theme: 'light'
      };

      await configUI.initialize(options);

      // Create file upload component
      const fileUpload = document.createElement('div');
      fileUpload.className = 'file-upload-component';
      fileUpload.innerHTML = `
        <input type="file" id="config-file-input" accept=".json,.yaml,.yml" style="display: none;">
        <button id="upload-button">Upload Configuration</button>
        <div id="file-info" style="display: none;"></div>
        <div id="upload-progress" style="display: none; width: 100%; height: 20px; background: #f0f0f0;">
          <div id="progress-bar" style="width: 0%; height: 100%; background: #007bff;"></div>
        </div>
      `;

      const mainContent = mockContainer.querySelector('.main-content');
      if (mainContent) {
        mainContent.appendChild(fileUpload);
      }

      const fileInput = document.getElementById('config-file-input') as HTMLInputElement;
      const uploadButton = document.getElementById('upload-button') as HTMLButtonElement;
      const fileInfo = document.getElementById('file-info') as HTMLElement;
      const uploadProgress = document.getElementById('upload-progress') as HTMLElement;
      const progressBar = document.getElementById('progress-bar') as HTMLElement;

      // Simulate file selection
      const mockFile = new File(['{"test": "data"}'], 'test-config.json', { type: 'application/json' });
      
      let fileSelected = false;
      fileInput.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          fileSelected = true;
          fileInfo.textContent = `Selected: ${files[0].name} (${files[0].size} bytes)`;
          fileInfo.style.display = 'block';
        }
      });

      uploadButton.addEventListener('click', () => {
        fileInput.click();
      });

      uploadButton.click();
      
      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      expect(fileSelected).toBe(true);
      expect(fileInfo.style.display).toBe('block');
      expect(fileInfo.textContent).toContain('test-config.json');

      // Simulate file upload progress
      uploadButton.addEventListener('click', () => {
        if (fileSelected) {
          uploadProgress.style.display = 'block';
          
          // Simulate progress
          let progress = 0;
          const progressInterval = setInterval(() => {
            progress += 10;
            progressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
              clearInterval(progressInterval);
              fileInfo.textContent = 'Upload completed successfully!';
            }
          }, 100);
        }
      });

      uploadButton.click();
      
      expect(uploadProgress.style.display).toBe('block');
      
      // Wait for progress to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      expect(progressBar.style.width).toBe('100%');
      expect(fileInfo.textContent).toBe('Upload completed successfully!');
    });

    test('should handle file validation and error handling', async () => {
      configUI = ConfigurationCenterUI.getInstance();
      
      const options: UIConfig = {
        containerId: 'automation-test-container',
        theme: 'light'
      };

      await configUI.initialize(options);

      // Create file upload with validation
      const fileUpload = document.createElement('div');
      fileUpload.className = 'file-upload-component';
      fileUpload.innerHTML = `
        <input type="file" id="validated-file-input" accept=".json,.yaml,.yml" style="display: none;">
        <button id="validated-upload-button">Upload Configuration</button>
        <div id="validation-error" class="error-message" style="display: none;"></div>
        <div id="file-preview" style="display: none;"></div>
      `;

      const mainContent = mockContainer.querySelector('.main-content');
      if (mainContent) {
        mainContent.appendChild(fileUpload);
      }

      const fileInput = document.getElementById('validated-file-input') as HTMLInputElement;
      const uploadButton = document.getElementById('validated-upload-button') as HTMLButtonElement;
      const validationError = document.getElementById('validation-error') as HTMLElement;
      const filePreview = document.getElementById('file-preview') as HTMLElement;

      // Test with invalid file type
      const invalidFile = new File(['invalid content'], 'test.txt', { type: 'text/plain' });
      
      fileInput.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const file = files[0];
          
          // Validate file type
          const allowedTypes = ['.json', '.yaml', '.yml'];
          const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
          
          if (!allowedTypes.includes(fileExtension)) {
            validationError.textContent = `Invalid file type: ${fileExtension}. Allowed types: ${allowedTypes.join(', ')}`;
            validationError.style.display = 'block';
            filePreview.style.display = 'none';
            return;
          }
          
          // Validate file size (max 5MB)
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (file.size > maxSize) {
            validationError.textContent = `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 5MB`;
            validationError.style.display = 'block';
            filePreview.style.display = 'none';
            return;
          }
          
          // If validation passes, show preview
          validationError.style.display = 'none';
          filePreview.style.display = 'block';
          filePreview.textContent = `File: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`;
        }
      });

      uploadButton.addEventListener('click', () => {
        fileInput.click();
      });

      // Test invalid file
      uploadButton.click();
      
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      expect(validationError.style.display).toBe('block');
      expect(validationError.textContent).toContain('Invalid file type: .txt');
      expect(filePreview.style.display).toBe('none');

      // Test valid file
      const validFile = new File(['{"valid": "json"}'], 'valid.json', { type: 'application/json' });
      
      uploadButton.click();
      
      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      expect(validationError.style.display).toBe('none');
      expect(filePreview.style.display).toBe('block');
      expect(filePreview.textContent).toContain('valid.json');
    });
  });

  describe('Dynamic Content Loading', () => {
    test('should handle dynamic content loading and rendering', async () => {
      configUI = ConfigurationCenterUI.getInstance();
      
      const options: UIConfig = {
        containerId: 'automation-test-container',
        theme: 'light'
      };

      await configUI.initialize(options);

      // Create dynamic content container
      const dynamicContainer = document.createElement('div');
      dynamicContainer.id = 'dynamic-content-container';
      dynamicContainer.innerHTML = `
        <div id="loading-indicator" style="display: none;">Loading...</div>
        <div id="content-area"></div>
        <button id="load-content-button">Load Content</button>
      `;

      const mainContent = mockContainer.querySelector('.main-content');
      if (mainContent) {
        mainContent.appendChild(dynamicContainer);
      }

      const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
      const contentArea = document.getElementById('content-area') as HTMLElement;
      const loadButton = document.getElementById('load-content-button') as HTMLButtonElement;

      // Simulate dynamic content loading
      loadButton.addEventListener('click', async () => {
        loadingIndicator.style.display = 'block';
        contentArea.innerHTML = '';
        
        // Simulate async content loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Load dynamic content
        const dynamicContent = document.createElement('div');
        dynamicContent.className = 'dynamic-content';
        dynamicContent.innerHTML = `
          <h3>Dynamic Configuration</h3>
          <div class="config-item">
            <label>Setting 1</label>
            <input type="text" value="dynamic-value-1">
          </div>
          <div class="config-item">
            <label>Setting 2</label>
            <input type="number" value="42">
          </div>
          <div class="config-item">
            <label>Setting 3</label>
            <select>
              <option value="option1">Option 1</option>
              <option value="option2" selected>Option 2</option>
            </select>
          </div>
        `;
        
        loadingIndicator.style.display = 'none';
        contentArea.appendChild(dynamicContent);
      });

      loadButton.click();
      
      expect(loadingIndicator.style.display).toBe('block');
      expect(contentArea.innerHTML).toBe('');
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      expect(loadingIndicator.style.display).toBe('none');
      expect(contentArea.querySelector('.dynamic-content')).toBeTruthy();
      expect(contentArea.querySelectorAll('.config-item').length).toBe(3);
      
      // Verify loaded content
      const firstInput = contentArea.querySelector('input[type="text"]') as HTMLInputElement;
      expect(firstInput.value).toBe('dynamic-value-1');
      
      const numberInput = contentArea.querySelector('input[type="number"]') as HTMLInputElement;
      expect(numberInput.value).toBe('42');
      
      const select = contentArea.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('option2');
    });

    test('should handle content updates and state management', async () => {
      configUI = ConfigurationCenterUI.getInstance();
      
      const options: UIConfig = {
        containerId: 'automation-test-container',
        theme: 'light'
      };

      await configUI.initialize(options);

      // Create state management test component
      const stateContainer = document.createElement('div');
      stateContainer.id = 'state-management-container';
      stateContainer.innerHTML = `
        <div id="state-display">Current state: initial</div>
        <button id="update-state-button">Update State</button>
        <button id="reset-state-button">Reset State</button>
        <div id="state-history"></div>
      `;

      const mainContent = mockContainer.querySelector('.main-content');
      if (mainContent) {
        mainContent.appendChild(stateContainer);
      }

      const stateDisplay = document.getElementById('state-display') as HTMLElement;
      const updateButton = document.getElementById('update-state-button') as HTMLButtonElement;
      const resetButton = document.getElementById('reset-state-button') as HTMLButtonElement;
      const stateHistory = document.getElementById('state-history') as HTMLElement;

      // State management
      let currentState = 'initial';
      const stateChanges: string[] = [];

      const updateState = (newState: string) => {
        currentState = newState;
        stateChanges.push(newState);
        
        stateDisplay.textContent = `Current state: ${currentState}`;
        
        // Update history
        stateHistory.innerHTML = '<h4>State History:</h4>';
        stateChanges.forEach((change, index) => {
          const historyItem = document.createElement('div');
          historyItem.textContent = `${index + 1}. ${change}`;
          stateHistory.appendChild(historyItem);
        });
      };

      updateButton.addEventListener('click', () => {
        const states = ['loading', 'processing', 'saving', 'completed'];
        const currentIndex = states.indexOf(currentState);
        const nextState = states[(currentIndex + 1) % states.length];
        updateState(nextState);
      });

      resetButton.addEventListener('click', () => {
        updateState('initial');
      });

      // Test state updates
      updateButton.click();
      expect(currentState).toBe('loading');
      expect(stateDisplay.textContent).toBe('Current state: loading');
      expect(stateChanges).toEqual(['loading']);

      updateButton.click();
      expect(currentState).toBe('processing');
      expect(stateChanges).toEqual(['loading', 'processing']);

      updateButton.click();
      expect(currentState).toBe('saving');
      expect(stateChanges).toEqual(['loading', 'processing', 'saving']);

      updateButton.click();
      expect(currentState).toBe('completed');
      expect(stateChanges).toEqual(['loading', 'processing', 'saving', 'completed']);

      // Test state reset
      resetButton.click();
      expect(currentState).toBe('initial');
      expect(stateChanges).toEqual(['loading', 'processing', 'saving', 'completed', 'initial']);

      // Verify history display
      expect(stateHistory.querySelectorAll('div').length).toBe(5);
      expect(stateHistory.textContent).toContain('1. loading');
      expect(stateHistory.textContent).toContain('5. initial');
    });
  });

  describe('User Interaction Patterns', () => {
    test('should handle drag and drop interactions', async () => {
      configUI = ConfigurationCenterUI.getInstance();
      
      const options: UIConfig = {
        containerId: 'automation-test-container',
        theme: 'light'
      };

      await configUI.initialize(options);

      // Create drag and drop component
      const dragDropContainer = document.createElement('div');
      dragDropContainer.id = 'drag-drop-container';
      dragDropContainer.innerHTML = `
        <div id="drop-zone" class="drop-zone" 
             style="border: 2px dashed #ccc; padding: 20px; text-align: center; min-height: 100px;">
          <p>Drag and drop configuration files here</p>
        </div>
        <div id="drop-status" style="margin-top: 10px;"></div>
      `;

      const mainContent = mockContainer.querySelector('.main-content');
      if (mainContent) {
        mainContent.appendChild(dragDropContainer);
      }

      const dropZone = document.getElementById('drop-zone') as HTMLElement;
      const dropStatus = document.getElementById('drop-status') as HTMLElement;

      let dragOverCount = 0;
      let dropCount = 0;

      // Drag and drop event handlers
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragOverCount++;
        dropZone.style.borderColor = '#007bff';
        dropZone.style.backgroundColor = '#f0f8ff';
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.backgroundColor = 'transparent';
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropCount++;
        
        dropZone.style.borderColor = '#ccc';
        dropZone.style.backgroundColor = 'transparent';
        
        const files = (e.dataTransfer as DataTransfer).files;
        if (files && files.length > 0) {
          dropStatus.textContent = `Dropped ${files.length} file(s): ${Array.from(files).map(f => f.name).join(', ')}`;
        }
      });

      // Simulate drag over
      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
      Object.defineProperty(dragOverEvent, 'preventDefault', { value: jest.fn() });
      dropZone.dispatchEvent(dragOverEvent);
      
      expect(dropZone.style.borderColor).toBe('rgb(0, 123, 255)');
      expect(dropZone.style.backgroundColor).toBe('rgb(240, 248, 255)');

      // Simulate drag leave
      const dragLeaveEvent = new Event('dragleave', { bubbles: true, cancelable: true });
      Object.defineProperty(dragLeaveEvent, 'preventDefault', { value: jest.fn() });
      dropZone.dispatchEvent(dragLeaveEvent);
      
      expect(dropZone.style.borderColor).toBe('rgb(204, 204, 204)');
      expect(dropZone.style.backgroundColor).toBe('transparent');

      // Simulate drop
      const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(dropEvent, 'preventDefault', { value: jest.fn() });
      
      const mockFile = new File(['test content'], 'dropped-config.json', { type: 'application/json' });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile]
        }
      });
      
      dropZone.dispatchEvent(dropEvent);
      
      expect(dropStatus.textContent).toBe('Dropped 1 file(s): dropped-config.json');
    });

    test('should handle keyboard navigation and accessibility', async () => {
      configUI = ConfigurationCenterUI.getInstance();
      
      const options: UIConfig = {
        containerId: 'automation-test-container',
        theme: 'light'
      };

      await configUI.initialize(options);

      // Create accessible navigation component
      const navContainer = document.createElement('nav');
      navContainer.setAttribute('role', 'navigation');
      navContainer.innerHTML = `
        <ul class="nav-menu" role="menubar">
          <li role="none">
            <button role="menuitem" tabindex="0" aria-haspopup="true" aria-expanded="false" data-menu="file">
              File
            </button>
            <ul class="submenu" role="menu" aria-hidden="true" style="display: none;">
              <li role="none"><button role="menuitem" tabindex="-1" data-action="new">New</button></li>
              <li role="none"><button role="menuitem" tabindex="-1" data-action="open">Open</button></li>
              <li role="none"><button role="menuitem" tabindex="-1" data-action="save">Save</button></li>
            </ul>
          </li>
          <li role="none">
            <button role="menuitem" tabindex="0" data-menu="edit">Edit</button>
          </li>
          <li role="none">
            <button role="menuitem" tabindex="0" data-menu="help">Help</button>
          </li>
        </ul>
        <div id="focus-indicator" style="margin-top: 20px;">Current focus: none</div>
      `;

      const mainContent = mockContainer.querySelector('.main-content');
      if (mainContent) {
        mainContent.appendChild(navContainer);
      }

      const menuButtons = navContainer.querySelectorAll('button[role="menuitem"]');
      const focusIndicator = document.getElementById('focus-indicator') as HTMLElement;

      // Track focus changes
      let currentFocus = 'none';
      const updateFocusIndicator = (element: HTMLElement) => {
        currentFocus = element.textContent || 'unknown';
        focusIndicator.textContent = `Current focus: ${currentFocus}`;
      };

      menuButtons.forEach(button => {
        button.addEventListener('focus', () => updateFocusIndicator(button));
        button.addEventListener('keydown', (e) => {
          const keyEvent = e as KeyboardEvent;
          
          switch (keyEvent.key) {
            case 'ArrowRight':
              keyEvent.preventDefault();
              const nextButton = button.nextElementSibling as HTMLElement;
              if (nextButton) {
                nextButton.focus();
              }
              break;
            case 'ArrowLeft':
              keyEvent.preventDefault();
              const prevButton = button.previousElementSibling as HTMLElement;
              if (prevButton) {
                prevButton.focus();
              }
              break;
            case 'Enter':
            case ' ':
              keyEvent.preventDefault();
              button.click();
              break;
            case 'Escape':
              keyEvent.preventDefault();
              // Close any open submenus
              const submenu = button.nextElementSibling as HTMLElement;
              if (submenu && submenu.classList.contains('submenu')) {
                submenu.style.display = 'none';
                button.setAttribute('aria-expanded', 'false');
              }
              break;
          }
        });
      });

      // Test keyboard navigation
      const fileButton = menuButtons[0] as HTMLElement;
      fileButton.focus();
      
      expect(currentFocus).toBe('File');
      expect(focusIndicator.textContent).toBe('Current focus: File');

      // Test arrow key navigation
      const rightArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      fileButton.dispatchEvent(rightArrowEvent);
      
      expect(currentFocus).toBe('Edit');

      // Test submenu interaction
      fileButton.focus();
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      fileButton.dispatchEvent(enterEvent);
      
      const submenu = fileButton.nextElementSibling as HTMLElement;
      expect(submenu.style.display).toBe('block');
      expect(fileButton.getAttribute('aria-expanded')).toBe('true');

      // Test Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      fileButton.dispatchEvent(escapeEvent);
      
      expect(submenu.style.display).toBe('none');
      expect(fileButton.getAttribute('aria-expanded')).toBe('false');
    });
  });
});