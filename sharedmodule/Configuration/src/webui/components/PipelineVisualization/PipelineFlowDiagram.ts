import { UIComponent } from '../../types/ui.types';

export class PipelineFlowDiagram implements UIComponent {
  private container: HTMLElement | null = null;
  private pipelineData: any = null;

  public async render(): Promise<void> {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="pipeline-flow-diagram">
        <div class="diagram-header">
          <h3>流水线流程图</h3>
          <div class="diagram-controls">
            <button class="btn btn-secondary" data-action="zoom-in">放大</button>
            <button class="btn btn-secondary" data-action="zoom-out">缩小</button>
            <button class="btn btn-secondary" data-action="reset-view">重置视图</button>
          </div>
        </div>
        
        <div class="diagram-content">
          ${this.renderFlowDiagram()}
        </div>
      </div>
    `;

    this.bindEventListeners();
  }

  private renderFlowDiagram(): string {
    if (!this.pipelineData) {
      return `
        <div class="empty-state">
          <p>暂无流水线数据</p>
        </div>
      `;
    }

    return `
      <div class="flow-diagram-container">
        <svg class="flow-diagram" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
          ${this.renderDiagramElements()}
        </svg>
      </div>
    `;
  }

  private renderDiagramElements(): string {
    let elements = '';
    
    // 渲染供应商节点
    if (this.pipelineData?.providers) {
      elements += this.renderProviderNodes();
    }
    
    // 渲染虚拟模型节点
    if (this.pipelineData?.virtualModels) {
      elements += this.renderVirtualModelNodes();
    }
    
    // 渲染路由连接
    if (this.pipelineData?.routes) {
      elements += this.renderRouteConnections();
    }
    
    return elements;
  }

  private renderProviderNodes(): string {
    const providers = this.pipelineData.providers;
    let nodes = '';
    
    providers.forEach((provider: any, index: number) => {
      const x = 100;
      const y = 100 + index * 100;
      
      nodes += `
        <g class="provider-node" data-id="${provider.id}">
          <rect x="${x}" y="${y}" width="120" height="60" rx="5" 
                class="node-rect provider-rect" />
          <text x="${x + 60}" y="${y + 25}" class="node-label" text-anchor="middle">
            ${provider.name}
          </text>
          <text x="${x + 60}" y="${y + 45}" class="node-sublabel" text-anchor="middle">
            ${provider.type}
          </text>
        </g>
      `;
    });
    
    return nodes;
  }

  private renderVirtualModelNodes(): string {
    const virtualModels = this.pipelineData.virtualModels;
    let nodes = '';
    
    virtualModels.forEach((vm: any, index: number) => {
      const x = 400;
      const y = 100 + index * 100;
      
      nodes += `
        <g class="vm-node" data-id="${vm.name}">
          <rect x="${x}" y="${y}" width="120" height="60" rx="5" 
                class="node-rect vm-rect ${vm.enabled ? 'enabled' : 'disabled'}" />
          <text x="${x + 60}" y="${y + 25}" class="node-label" text-anchor="middle">
            ${vm.name}
          </text>
          <text x="${x + 60}" y="${y + 45}" class="node-sublabel" text-anchor="middle">
            ${vm.targetProvider}
          </text>
        </g>
      `;
    });
    
    return nodes;
  }

  private renderRouteConnections(): string {
    let connections = '';
    
    // 简化的连接线渲染
    if (this.pipelineData.providers && this.pipelineData.virtualModels) {
      connections += `
        <line x1="220" y1="130" x2="400" y2="130" 
              class="connection-line" marker-end="url(#arrowhead)" />
        <line x1="220" y1="230" x2="400" y2="230" 
              class="connection-line" marker-end="url(#arrowhead)" />
      `;
    }
    
    return connections;
  }

  private bindEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const action = target.getAttribute('data-action');
      
      if (action === 'zoom-in') {
        this.zoomIn();
      } else if (action === 'zoom-out') {
        this.zoomOut();
      } else if (action === 'reset-view') {
        this.resetView();
      }
    });
  }

  private zoomIn(): void {
    console.log('放大视图');
  }

  private zoomOut(): void {
    console.log('缩小视图');
  }

  private resetView(): void {
    console.log('重置视图');
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