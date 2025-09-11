import { UIComponent } from '../../types/ui.types';

export class PipelineDashboard implements UIComponent {
  private container: HTMLElement | null = null;
  private pipelineData: any = null;

  public async render(): Promise<void> {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="pipeline-dashboard">
        <div class="dashboard-header">
          <h3>流水线仪表板</h3>
          <div class="dashboard-controls">
            <button class="btn btn-secondary" data-action="refresh">刷新</button>
            <button class="btn btn-primary" data-action="export">导出配置</button>
          </div>
        </div>
        
        <div class="dashboard-content">
          ${this.renderDashboardContent()}
        </div>
      </div>
    `;

    this.bindEventListeners();
  }

  private renderDashboardContent(): string {
    if (!this.pipelineData) {
      return `
        <div class="empty-state">
          <p>暂无流水线数据</p>
        </div>
      `;
    }

    return `
      <div class="dashboard-stats">
        <div class="stat-card">
          <div class="stat-value">${this.pipelineData.pipelines?.length || 0}</div>
          <div class="stat-label">流水线</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this.pipelineData.providers?.length || 0}</div>
          <div class="stat-label">供应商</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this.pipelineData.virtualModels?.length || 0}</div>
          <div class="stat-label">虚拟模型</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this.pipelineData.routes?.length || 0}</div>
          <div class="stat-label">路由</div>
        </div>
      </div>
      
      <div class="dashboard-details">
        <div class="detail-section">
          <h4>供应商配置</h4>
          <div class="provider-list">
            ${this.renderProviderList()}
          </div>
        </div>
        
        <div class="detail-section">
          <h4>虚拟模型映射</h4>
          <div class="vm-list">
            ${this.renderVirtualModelList()}
          </div>
        </div>
      </div>
    `;
  }

  private renderProviderList(): string {
    if (!this.pipelineData?.providers || this.pipelineData.providers.length === 0) {
      return '<p>暂无供应商配置</p>';
    }

    return this.pipelineData.providers.map((provider: any) => `
      <div class="provider-item">
        <div class="provider-name">${provider.name}</div>
        <div class="provider-type">${provider.type}</div>
        <div class="provider-models">${provider.models?.length || 0} 个模型</div>
      </div>
    `).join('');
  }

  private renderVirtualModelList(): string {
    if (!this.pipelineData?.virtualModels || this.pipelineData.virtualModels.length === 0) {
      return '<p>暂无虚拟模型映射</p>';
    }

    return this.pipelineData.virtualModels.map((vm: any) => `
      <div class="vm-item">
        <div class="vm-name">${vm.name}</div>
        <div class="vm-target">${vm.targetProvider}/${vm.targetModel}</div>
        <div class="vm-status ${vm.enabled ? 'enabled' : 'disabled'}">
          ${vm.enabled ? '启用' : '禁用'}
        </div>
      </div>
    `).join('');
  }

  private bindEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const action = target.getAttribute('data-action');
      
      if (action === 'refresh') {
        this.refreshDashboard();
      } else if (action === 'export') {
        this.exportConfiguration();
      }
    });
  }

  private refreshDashboard(): void {
    // 触发刷新逻辑
    console.log('刷新仪表板');
  }

  private exportConfiguration(): void {
    // 导出配置逻辑
    console.log('导出配置');
  }

  public setData(data: any): void {
    this.pipelineData = data;
  }

  public getData(): any {
    return this.pipelineData;
  }

  public async destroy(): Promise<void> {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}