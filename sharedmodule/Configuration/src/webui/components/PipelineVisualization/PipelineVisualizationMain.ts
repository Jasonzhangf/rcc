import { UIComponent } from '../../types/ui.types';
import { PipelineDashboard } from './PipelineDashboard';
import { PipelineFlowDiagram } from './PipelineFlowDiagram';
import { PipelineTableView } from './PipelineTableView';

export class PipelineVisualizationMain implements UIComponent {
  private container: HTMLElement | null = null;
  private pipelineData: any = null;
  private activeTab: string = 'dashboard';
  
  // 子组件
  private dashboard: PipelineDashboard;
  private flowDiagram: PipelineFlowDiagram;
  private tableView: PipelineTableView;

  constructor() {
    this.dashboard = new PipelineDashboard();
    this.flowDiagram = new PipelineFlowDiagram();
    this.tableView = new PipelineTableView();
  }

  public async render(): Promise<void> {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="pipeline-visualization">
        <div class="visualization-header">
          <h2>流水线可视化</h2>
          <div class="header-tabs">
            <button class="tab-btn ${this.activeTab === 'dashboard' ? 'active' : ''}" 
                    data-tab="dashboard">
              仪表板
            </button>
            <button class="tab-btn ${this.activeTab === 'flow' ? 'active' : ''}" 
                    data-tab="flow">
              流程图
            </button>
            <button class="tab-btn ${this.activeTab === 'table' ? 'active' : ''}" 
                    data-tab="table">
              配置表
            </button>
          </div>
        </div>
        
        <div class="visualization-content">
          <div class="tab-content" id="dashboard-tab" 
               style="display: ${this.activeTab === 'dashboard' ? 'block' : 'none'};">
            <div id="dashboard-container"></div>
          </div>
          <div class="tab-content" id="flow-tab" 
               style="display: ${this.activeTab === 'flow' ? 'block' : 'none'};">
            <div id="flow-diagram-container"></div>
          </div>
          <div class="tab-content" id="table-tab" 
               style="display: ${this.activeTab === 'table' ? 'block' : 'none'};">
            <div id="table-view-container"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEventListeners();
    await this.renderSubComponents();
    this.loadStyles();
  }

  private async renderSubComponents(): Promise<void> {
    // 渲染仪表板
    const dashboardContainer = this.container?.querySelector('#dashboard-container');
    if (dashboardContainer) {
      this.dashboard.setData(this.pipelineData);
      await this.dashboard.render();
    }

    // 渲染流程图
    const flowContainer = this.container?.querySelector('#flow-diagram-container');
    if (flowContainer) {
      this.flowDiagram.setData(this.pipelineData);
      await this.flowDiagram.render();
    }

    // 渲染表格视图
    const tableContainer = this.container?.querySelector('#table-view-container');
    if (tableContainer) {
      this.tableView.setData(this.pipelineData);
      await this.tableView.render();
    }
  }

  private bindEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // 标签页切换
      if (target.classList.contains('tab-btn')) {
        const tab = target.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
        }
      }
    });
  }

  private switchTab(tab: string): void {
    this.activeTab = tab;
    this.render();
  }

  public setData(data: any): void {
    this.pipelineData = data;
    
    // 更新子组件数据
    this.dashboard.setData(data);
    this.flowDiagram.setData(data);
    this.tableView.setData(data);
  }

  public getData(): any {
    return this.pipelineData;
  }

  private loadStyles(): void {
    const styleId = 'pipeline-visualization-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .pipeline-visualization {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .visualization-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: var(--bg-secondary, #ffffff);
        border-bottom: 1px solid var(--border-color, #dee2e6);
      }

      .visualization-header h2 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--text-primary, #212529);
      }

      .header-tabs {
        display: flex;
        gap: 0.5rem;
      }

      .tab-btn {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.375rem;
        background: var(--bg-secondary, #ffffff);
        color: var(--text-primary, #212529);
        cursor: pointer;
        transition: all 0.2s;
      }

      .tab-btn.active {
        background: var(--primary-color, #0d6efd);
        color: white;
        border-color: var(--primary-color, #0d6efd);
      }

      .tab-btn:hover:not(.active) {
        background: var(--bg-hover, #f8f9fa);
      }

      .visualization-content {
        flex: 1;
        overflow: auto;
      }

      .tab-content {
        height: 100%;
        padding: 1rem;
      }

      /* 仪表板样式 */
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }

      .dashboard-header h3 {
        margin: 0;
        color: var(--text-primary, #212529);
      }

      .dashboard-controls {
        display: flex;
        gap: 0.5rem;
      }

      .dashboard-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        margin-bottom: 2rem;
      }

      .stat-card {
        background: var(--bg-secondary, #ffffff);
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.5rem;
        padding: 1.5rem;
        text-align: center;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: bold;
        color: var(--primary-color, #0d6efd);
        margin-bottom: 0.5rem;
      }

      .stat-label {
        color: var(--text-secondary, #6c757d);
        font-size: 0.875rem;
      }

      .dashboard-details {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 2rem;
      }

      .detail-section h4 {
        margin: 0 0 1rem 0;
        color: var(--text-primary, #212529);
        border-bottom: 1px solid var(--border-color, #dee2e6);
        padding-bottom: 0.5rem;
      }

      .provider-item, .vm-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.375rem;
        margin-bottom: 0.5rem;
        background: var(--bg-secondary, #ffffff);
      }

      .provider-name, .vm-name {
        font-weight: 500;
        color: var(--text-primary, #212529);
      }

      .provider-type, .vm-target {
        color: var(--text-secondary, #6c757d);
        font-size: 0.875rem;
      }

      .provider-models {
        color: var(--text-muted, #adb5bd);
        font-size: 0.875rem;
      }

      .vm-status {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .vm-status.enabled {
        background: var(--success-bg, #d1e7dd);
        color: var(--success-color, #198754);
      }

      .vm-status.disabled {
        background: var(--error-bg, #f8d7da);
        color: var(--error-color, #dc3545);
      }

      /* 流程图样式 */
      .diagram-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }

      .diagram-header h3 {
        margin: 0;
        color: var(--text-primary, #212529);
      }

      .diagram-controls {
        display: flex;
        gap: 0.5rem;
      }

      .flow-diagram-container {
        background: var(--bg-secondary, #ffffff);
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.5rem;
        padding: 1rem;
        height: 500px;
        overflow: auto;
      }

      .flow-diagram {
        width: 100%;
        height: 100%;
      }

      .node-rect {
        fill: var(--bg-secondary, #ffffff);
        stroke: var(--border-color, #dee2e6);
        stroke-width: 1;
      }

      .provider-rect {
        fill: #e3f2fd;
      }

      .vm-rect {
        fill: #e8f5e9;
      }

      .vm-rect.disabled {
        fill: #ffebee;
      }

      .node-label {
        fill: var(--text-primary, #212529);
        font-size: 12px;
        font-weight: 500;
      }

      .node-sublabel {
        fill: var(--text-secondary, #6c757d);
        font-size: 10px;
      }

      .connection-line {
        stroke: var(--border-color, #dee2e6);
        stroke-width: 2;
      }

      /* 表格视图样式 */
      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }

      .table-header h3 {
        margin: 0;
        color: var(--text-primary, #212529);
      }

      .table-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .search-input {
        padding: 0.5rem;
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.375rem;
        font-size: 0.875rem;
      }

      .table-container {
        background: var(--bg-secondary, #ffffff);
        border: 1px solid var(--border-color, #dee2e6);
        border-radius: 0.5rem;
        overflow: auto;
      }

      .pipeline-table {
        width: 100%;
        border-collapse: collapse;
      }

      .pipeline-table th {
        background: var(--bg-primary, #f8f9fa);
        padding: 0.75rem 1rem;
        text-align: left;
        font-weight: 500;
        color: var(--text-secondary, #6c757d);
        border-bottom: 1px solid var(--border-color, #dee2e6);
      }

      .pipeline-table td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--border-color, #dee2e6);
        color: var(--text-primary, #212529);
      }

      .pipeline-table tr:hover {
        background: var(--bg-hover, #f8f9fa);
      }

      .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .status-badge.active {
        background: var(--success-bg, #d1e7dd);
        color: var(--success-color, #198754);
      }

      .status-badge.inactive {
        background: var(--error-bg, #f8d7da);
        color: var(--error-color, #dc3545);
      }

      .btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        margin-right: 0.25rem;
      }

      .btn-sm:last-child {
        margin-right: 0;
      }

      .table-footer {
        margin-top: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .pagination {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .pagination-info {
        color: var(--text-secondary, #6c757d);
        font-size: 0.875rem;
      }

      .pagination-controls {
        display: flex;
        gap: 0.25rem;
      }

      /* 空状态样式 */
      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--text-secondary, #6c757d);
      }

      .empty-state p {
        margin: 0;
      }

      /* 响应式设计 */
      @media (max-width: 768px) {
        .dashboard-stats {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .dashboard-details {
          grid-template-columns: 1fr;
        }
        
        .table-container {
          overflow-x: auto;
        }
      }
    `;

    document.head.appendChild(style);
  }

  public async destroy(): Promise<void> {
    // 销毁子组件
    await this.dashboard.destroy();
    await this.flowDiagram.destroy();
    await this.tableView.destroy();

    // 清理DOM
    if (this.container) {
      this.container.innerHTML = '';
    }

    // 移除样式
    const style = document.getElementById('pipeline-visualization-styles');
    if (style) {
      style.remove();
    }
  }
}