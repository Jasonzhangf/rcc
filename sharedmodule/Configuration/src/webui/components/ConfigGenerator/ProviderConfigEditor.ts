import { UIComponent } from '../../types/ui.types';

interface ProviderConfig {
  id: string;
  name: string;
  protocol: string;
  api_base_url: string;
  api_key: string[];
  models: Record<string, any>;
}

export class ProviderConfigEditor implements UIComponent {
  private container: HTMLElement | null = null;
  private providers: Record<string, ProviderConfig> = {};
  private onUpdateCallback: ((data: any) => void) | null = null;

  public async render(options: { 
    container: HTMLElement, 
    onUpdate?: (data: any) => void 
  }): Promise<void> {
    this.container = options.container;
    this.onUpdateCallback = options.onUpdate || null;

    this.container.innerHTML = `
      <div class="provider-config-editor">
        <div class="editor-header">
          <h3>供应商配置</h3>
          <button class="btn btn-primary" data-action="add-provider">➕ 添加供应商</button>
        </div>
        
        <div class="provider-list" id="provider-list">
          ${this.renderProviders()}
        </div>
      </div>
    `;

    this.bindEventListeners();
  }

  private renderProviders(): string {
    if (Object.keys(this.providers).length === 0) {
      return `
        <div class="empty-state">
          <p>暂无供应商配置</p>
          <button class="btn btn-primary" data-action="add-provider">添加第一个供应商</button>
        </div>
      `;
    }

    return Object.entries(this.providers).map(([id, provider]) => `
      <div class="provider-card" data-provider-id="${id}">
        <div class="provider-header">
          <h4>${provider.name}</h4>
          <button class="btn btn-danger btn-sm" data-action="remove-provider" data-provider-id="${id}">删除</button>
        </div>
        <div class="provider-form">
          <div class="form-group">
            <label>供应商ID</label>
            <input type="text" class="form-control" value="${id}" readonly>
          </div>
          <div class="form-group">
            <label>名称</label>
            <input type="text" class="form-control provider-name" data-field="name" data-provider-id="${id}" value="${provider.name}">
          </div>
          <div class="form-group">
            <label>协议</label>
            <select class="form-control provider-protocol" data-field="protocol" data-provider-id="${id}">
              <option value="openai" ${provider.protocol === 'openai' ? 'selected' : ''}>OpenAI</option>
              <option value="anthropic" ${provider.protocol === 'anthropic' ? 'selected' : ''}>Anthropic</option>
              <option value="google" ${provider.protocol === 'google' ? 'selected' : ''}>Google</option>
              <option value="custom" ${provider.protocol === 'custom' ? 'selected' : ''}>自定义</option>
            </select>
          </div>
          <div class="form-group">
            <label>API端点</label>
            <input type="text" class="form-control provider-endpoint" data-field="api_base_url" data-provider-id="${id}" value="${provider.api_base_url}">
          </div>
          <div class="form-group">
            <label>API密钥</label>
            <textarea class="form-control provider-api-key" data-field="api_key" data-provider-id="${id}" rows="2">${provider.api_key.join('\n')}</textarea>
          </div>
        </div>
      </div>
    `).join('');
  }

  private bindEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const action = target.getAttribute('data-action');
      
      if (action === 'add-provider') {
        this.addProvider();
      } else if (action === 'remove-provider') {
        const providerId = target.getAttribute('data-provider-id');
        if (providerId) {
          this.removeProvider(providerId);
        }
      }
    });

    this.container.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      const field = target.getAttribute('data-field');
      const providerId = target.getAttribute('data-provider-id');
      
      if (field && providerId && this.providers[providerId]) {
        this.updateProviderField(providerId, field, target.value);
      }
    });
  }

  private addProvider(): void {
    const id = `provider-${Date.now()}`;
    this.providers[id] = {
      id,
      name: `新供应商 ${Object.keys(this.providers).length + 1}`,
      protocol: 'openai',
      api_base_url: '',
      api_key: [''],
      models: {}
    };
    
    this.refreshView();
  }

  private removeProvider(providerId: string): void {
    delete this.providers[providerId];
    this.refreshView();
  }

  private updateProviderField(providerId: string, field: string, value: string): void {
    if (this.providers[providerId]) {
      if (field === 'api_key') {
        this.providers[providerId][field] = value.split('\n').filter(key => key.trim());
      } else {
        (this.providers[providerId] as any)[field] = value;
      }
      
      // Notify parent of changes
      if (this.onUpdateCallback) {
        this.onUpdateCallback({ providers: this.providers });
      }
    }
  }

  private refreshView(): void {
    if (this.container) {
      const listContainer = this.container.querySelector('#provider-list');
      if (listContainer) {
        listContainer.innerHTML = this.renderProviders();
      }
    }
  }

  public setData(data: { providers: Record<string, ProviderConfig> }): void {
    this.providers = data.providers || {};
  }

  public getData(): any {
    return { providers: this.providers };
  }

  public validate(): boolean | string[] {
    const errors: string[] = [];
    
    for (const [id, provider] of Object.entries(this.providers)) {
      if (!provider.name.trim()) {
        errors.push(`供应商 "${id}" 的名称不能为空`);
      }
      if (!provider.api_base_url.trim()) {
        errors.push(`供应商 "${provider.name}" 的API端点不能为空`);
      }
      if (provider.api_key.length === 0 || provider.api_key.some(key => !key.trim())) {
        errors.push(`供应商 "${provider.name}" 必须至少有一个有效的API密钥`);
      }
    }
    
    return errors.length > 0 ? errors : true;
  }

  public async destroy(): Promise<void> {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}