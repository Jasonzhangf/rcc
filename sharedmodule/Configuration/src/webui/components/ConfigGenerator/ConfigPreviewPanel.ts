import { UIComponent } from '../../types/ui.types';

export class ConfigPreviewPanel implements UIComponent {
  private container: HTMLElement | null = null;
  private config: any = null;

  public async render(): Promise<void> {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="config-preview-panel">
        <div class="preview-header">
          <h3>📋 配置预览</h3>
          <div class="preview-actions">
            <button class="btn btn-sm btn-secondary" data-action="copy-config">📋 复制</button>
            <button class="btn btn-sm btn-secondary" data-action="download-config">💾 下载</button>
          </div>
        </div>
        <div class="preview-content">
          <pre class="config-json" id="config-preview">${this.config ? JSON.stringify(this.config, null, 2) : '{}'}</pre>
        </div>
        <div class="preview-info">
          <div class="info-item">
            <span class="info-label">更新时间:</span>
            <span class="info-value">${this.config?.metadata?.updatedAt || '未保存'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">供应商数量:</span>
            <span class="info-value">${this.config?.providers ? Object.keys(this.config.providers).length : 0}</span>
          </div>
          <div class="info-item">
            <span class="info-label">虚拟模型:</span>
            <span class="info-value">${this.config?.virtualModels ? Object.keys(this.config.virtualModels).length : 0}</span>
          </div>
        </div>
      </div>
    `;

    this.bindEventListeners();
  }

  private bindEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const action = target.getAttribute('data-action');
      
      if (action === 'copy-config') {
        this.copyConfiguration();
      } else if (action === 'download-config') {
        this.downloadConfiguration();
      }
    });
  }

  private copyConfiguration(): void {
    const previewElement = this.container?.querySelector('#config-preview');
    if (previewElement) {
      navigator.clipboard.writeText(previewElement.textContent || '');
      alert('配置已复制到剪贴板');
    }
  }

  private downloadConfiguration(): void {
    if (!this.config) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "rcc-config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  public setData(config: any): void {
    this.config = config;
  }

  public getData(): any {
    return this.config;
  }

  public async destroy(): Promise<void> {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}