import { UIComponent } from '../../types/ui.types';

interface VirtualModelConfig {
  name: string;
  targetProvider: string;
  targetModel: string;
  enabled: boolean;
  displayName?: string;
  description?: string;
}

export class VirtualModelMapper implements UIComponent {
  private container: HTMLElement | null = null;
  private virtualModels: Record<string, VirtualModelConfig> = {};
  private providers: Record<string, any> = {};
  private onUpdateCallback: ((data: any) => void) | null = null;

  public async render(options: { 
    container: HTMLElement, 
    onUpdate?: (data: any) => void 
  }): Promise<void> {
    this.container = options.container;
    this.onUpdateCallback = options.onUpdate || null;

    this.container.innerHTML = `
      <div class="virtual-model-mapper">
        <div class="editor-header">
          <h3>虚拟模型映射</h3>
          <button class="btn btn-primary" data-action="add-virtual-model">➕ 添加虚拟模型</button>
        </div>
        
        <div class="virtual-model-list" id="virtual-model-list">
          ${this.renderVirtualModels()}
        </div>
      </div>
    `;

    this.bindEventListeners();
  }

  private renderVirtualModels(): string {
    if (Object.keys(this.virtualModels).length === 0) {
      return `
        <div class="empty-state">
          <p>暂无虚拟模型配置</p>
          <button class="btn btn-primary" data-action="add-virtual-model">添加第一个虚拟模型</button>
        </div>
      `;
    }

    return Object.entries(this.virtualModels).map(([name, vm]) => `
      <div class="virtual-model-card" data-vm-name="${name}">
        <div class="vm-header">
          <h4>${vm.displayName || name}</h4>
          <button class="btn btn-danger btn-sm" data-action="remove-vm" data-vm-name="${name}">删除</button>
        </div>
        <div class="vm-form">
          <div class="form-group">
            <label>虚拟模型名称</label>
            <input type="text" class="form-control vm-name" data-field="name" data-vm-name="${name}" value="${name}" readonly>
          </div>
          <div class="form-group">
            <label>显示名称</label>
            <input type="text" class="form-control vm-display-name" data-field="displayName" data-vm-name="${name}" value="${vm.displayName || ''}">
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea class="form-control vm-description" data-field="description" data-vm-name="${name}" rows="2">${vm.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label>目标供应商</label>
            <select class="form-control vm-target-provider" data-field="targetProvider" data-vm-name="${name}">
              <option value="">请选择供应商</option>
              ${Object.entries(this.providers).map(([id, provider]) => `
                <option value="${id}" ${vm.targetProvider === id ? 'selected' : ''}>${provider.name || id}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>目标模型</label>
            <select class="form-control vm-target-model" data-field="targetModel" data-vm-name="${name}">
              <option value="">请选择模型</option>
              ${this.renderModelOptions(vm.targetProvider, vm.targetModel)}
            </select>
          </div>
          <div class="form-check">
            <input type="checkbox" class="form-check-input vm-enabled" data-field="enabled" data-vm-name="${name}" ${vm.enabled ? 'checked' : ''}>
            <label class="form-check-label">启用</label>
          </div>
        </div>
      </div>
    `).join('');
  }

  private renderModelOptions(selectedProvider: string, selectedModel: string): string {
    if (!selectedProvider || !this.providers[selectedProvider]) {
      return '';
    }
    
    const provider = this.providers[selectedProvider];
    if (!provider.models) {
      return '';
    }
    
    return Object.entries(provider.models).map(([modelId, model]) => {
      const modelName = typeof model === 'object' && model !== null && 'name' in model ? (model as any).name : modelId;
      return `<option value="${modelId}" ${selectedModel === modelId ? 'selected' : ''}>${modelName}</option>`;
    }).join('');
  }

  private bindEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const action = target.getAttribute('data-action');
      
      if (action === 'add-virtual-model') {
        this.addVirtualModel();
      } else if (action === 'remove-vm') {
        const vmName = target.getAttribute('data-vm-name');
        if (vmName) {
          this.removeVirtualModel(vmName);
        }
      }
    });

    this.container.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const field = target.getAttribute('data-field');
      const vmName = target.getAttribute('data-vm-name');
      
      if (field && vmName && this.virtualModels[vmName]) {
        this.updateVirtualModelField(vmName, field, target.value, target.type === 'checkbox' ? (target as HTMLInputElement).checked : undefined);
      }
    });

    this.container.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement;
      if (target.classList.contains('vm-target-provider')) {
        const vmName = target.getAttribute('data-vm-name');
        if (vmName) {
          this.updateTargetProvider(vmName, target.value);
        }
      }
    });
  }

  private addVirtualModel(): void {
    const name = `virtual-model-${Date.now()}`;
    this.virtualModels[name] = {
      name,
      targetProvider: '',
      targetModel: '',
      enabled: true,
      displayName: `新虚拟模型 ${Object.keys(this.virtualModels).length + 1}`
    };
    
    this.refreshView();
  }

  private removeVirtualModel(vmName: string): void {
    delete this.virtualModels[vmName];
    this.refreshView();
  }

  private updateVirtualModelField(vmName: string, field: string, value: string, checked?: boolean): void {
    if (this.virtualModels[vmName]) {
      if (field === 'enabled' && checked !== undefined) {
        this.virtualModels[vmName][field] = checked;
      } else {
        (this.virtualModels[vmName] as any)[field] = value;
      }
      
      // Notify parent of changes
      if (this.onUpdateCallback) {
        this.onUpdateCallback({ virtualModels: this.virtualModels });
      }
    }
  }

  private updateTargetProvider(vmName: string, providerId: string): void {
    if (this.virtualModels[vmName]) {
      this.virtualModels[vmName].targetProvider = providerId;
      this.virtualModels[vmName].targetModel = ''; // Reset model when provider changes
      
      // Notify parent of changes
      if (this.onUpdateCallback) {
        this.onUpdateCallback({ virtualModels: this.virtualModels });
      }
      
      // Refresh view to update model options
      this.refreshView();
    }
  }

  private refreshView(): void {
    if (this.container) {
      const listContainer = this.container.querySelector('#virtual-model-list');
      if (listContainer) {
        listContainer.innerHTML = this.renderVirtualModels();
      }
    }
  }

  public setData(data: { 
    virtualModels: Record<string, VirtualModelConfig>,
    providers: Record<string, any>
  }): void {
    this.virtualModels = data.virtualModels || {};
    this.providers = data.providers || {};
  }

  public getData(): any {
    return { virtualModels: this.virtualModels };
  }

  public async destroy(): Promise<void> {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}