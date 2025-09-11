import { UIComponent } from '../../types/ui.types';

export class PipelineTableView implements UIComponent {
  private container: HTMLElement | null = null;
  private pipelineData: any = null;
  private currentPage: number = 1;
  private itemsPerPage: number = 10;

  public async render(): Promise<void> {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="pipeline-table-view">
        <div class="table-header">
          <h3>流水线配置表</h3>
          <div class="table-controls">
            <input type="text" class="search-input" placeholder="搜索流水线..." data-action="search">
            <button class="btn btn-secondary" data-action="refresh">刷新</button>
          </div>
        </div>
        
        <div class="table-content">
          ${this.renderTableContent()}
        </div>
        
        <div class="table-footer">
          ${this.renderPagination()}
        </div>
      </div>
    `;

    this.bindEventListeners();
  }

  private renderTableContent(): string {
    if (!this.pipelineData?.pipelines || this.pipelineData.pipelines.length === 0) {
      return `
        <div class="empty-state">
          <p>暂无流水线配置</p>
        </div>
      `;
    }

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedPipelines = this.pipelineData.pipelines.slice(startIndex, endIndex);

    return `
      <div class="table-container">
        <table class="pipeline-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>供应商</th>
              <th>模型</th>
              <th>虚拟模型</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedPipelines.map((pipeline: any) => `
              <tr data-id="${pipeline.id}">
                <td>${pipeline.id}</td>
                <td>${pipeline.name || pipeline.id}</td>
                <td>${pipeline.provider?.name || pipeline.llmswitch?.provider}</td>
                <td>${pipeline.llmswitch?.model || 'N/A'}</td>
                <td>${pipeline.virtualModels?.join(', ') || '无'}</td>
                <td>
                  <span class="status-badge ${this.getPipelineStatus(pipeline)}">
                    ${this.getPipelineStatusText(pipeline)}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-secondary" data-action="view" data-id="${pipeline.id}">
                    查看
                  </button>
                  <button class="btn btn-sm btn-danger" data-action="delete" data-id="${pipeline.id}">
                    删除
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private getPipelineStatus(pipeline: any): string {
    // 简单的状态判断逻辑
    return 'active';
  }

  private getPipelineStatusText(pipeline: any): string {
    // 简单的状态文本
    return '活跃';
  }

  private renderPagination(): string {
    if (!this.pipelineData?.pipelines) return '';

    const totalItems = this.pipelineData.pipelines.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);

    if (totalPages <= 1) return '';

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(`
        <button class="btn btn-sm ${i === this.currentPage ? 'btn-primary' : 'btn-secondary'}" 
                data-action="page" data-page="${i}">
          ${i}
        </button>
      `);
    }

    return `
      <div class="pagination">
        <span class="pagination-info">
          显示 ${Math.min((this.currentPage - 1) * this.itemsPerPage + 1, totalItems)} 
          到 ${Math.min(this.currentPage * this.itemsPerPage, totalItems)} 
          条，共 ${totalItems} 条记录
        </span>
        <div class="pagination-controls">
          ${pages.join('')}
        </div>
      </div>
    `;
  }

  private bindEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const action = target.getAttribute('data-action');
      
      if (action === 'refresh') {
        this.refreshTable();
      } else if (action === 'view') {
        const id = target.getAttribute('data-id');
        if (id) this.viewPipelineDetails(id);
      } else if (action === 'delete') {
        const id = target.getAttribute('data-id');
        if (id) this.deletePipeline(id);
      } else if (action === 'page') {
        const page = target.getAttribute('data-page');
        if (page) {
          this.currentPage = parseInt(page);
          this.render();
        }
      }
    });

    this.container.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      const action = target.getAttribute('data-action');
      
      if (action === 'search') {
        this.searchPipelines(target.value);
      }
    });
  }

  private refreshTable(): void {
    console.log('刷新表格');
    this.currentPage = 1;
    this.render();
  }

  private viewPipelineDetails(id: string): void {
    console.log('查看流水线详情:', id);
  }

  private deletePipeline(id: string): void {
    if (confirm(`确定要删除流水线 ${id} 吗？`)) {
      console.log('删除流水线:', id);
    }
  }

  private searchPipelines(query: string): void {
    console.log('搜索流水线:', query);
  }

  public setData(data: any): void {
    this.pipelineData = data;
    this.currentPage = 1; // 重置到第一页
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