/**
 * UI工具函数
 * 
 * 提供UI相关的工具函数和帮助方法
 */

import { NotificationConfig, ModalConfig, TooltipConfig } from '../types/ui.types';

/**
 * 生成唯一ID
 */
export function generateId(prefix = 'ui'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string | number, format = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = new Date(date);
  
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 获取相对时间
 */
export function getRelativeTime(date: Date | string | number): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < week) {
    return `${Math.floor(diff / day)}天前`;
  } else if (diff < month) {
    return `${Math.floor(diff / week)}周前`;
  } else if (diff < year) {
    return `${Math.floor(diff / month)}个月前`;
  } else {
    return `${Math.floor(diff / year)}年前`;
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function (this: any, ...args: Parameters<T>) {
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) {
        func.apply(this, args);
      }
    }, wait);
    
    if (callNow) {
      func.apply(this, args);
    }
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
  };
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * 对象比较
 */
export function isEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!isEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * 显示通知
 */
export function showNotification(config: NotificationConfig): void {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${config.type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-title">${config.title}</div>
      <div class="notification-message">${config.message}</div>
      ${config.actions ? `
        <div class="notification-actions">
          ${config.actions.map(action => `
            <button class="notification-action" data-action="${action.label}">
              ${action.label}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
    ${config.closable !== false ? '<button class="notification-close">&times;</button>' : ''}
  `;
  
  // 添加样式
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 300px;
        max-width: 500px;
        padding: 1rem;
        background: white;
        border-left: 4px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
      }
      
      .notification.show {
        transform: translateX(0);
      }
      
      .notification-info { border-left-color: #007bff; }
      .notification-success { border-left-color: #28a745; }
      .notification-warning { border-left-color: #ffc107; }
      .notification-error { border-left-color: #dc3545; }
      
      .notification-title {
        font-weight: bold;
        margin-bottom: 0.5rem;
      }
      
      .notification-message {
        color: #666;
        line-height: 1.4;
      }
      
      .notification-close {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        color: #999;
      }
      
      .notification-actions {
        margin-top: 1rem;
        display: flex;
        gap: 0.5rem;
      }
      
      .notification-action {
        padding: 0.25rem 0.75rem;
        border: 1px solid #ddd;
        background: #f8f9fa;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.875rem;
      }
    `;
    document.head.appendChild(style);
  }
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 显示动画
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // 绑定事件
  notification.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    
    if (target.classList.contains('notification-close')) {
      removeNotification(notification);
    } else if (target.classList.contains('notification-action')) {
      const actionLabel = target.getAttribute('data-action');
      const action = config.actions?.find(a => a.label === actionLabel);
      if (action) {
        action.action();
        removeNotification(notification);
      }
    }
  });
  
  // 自动隐藏
  if (config.duration !== 0) {
    setTimeout(() => {
      removeNotification(notification);
    }, config.duration || 5000);
  }
}

/**
 * 移除通知
 */
function removeNotification(notification: HTMLElement): void {
  notification.style.transform = 'translateX(100%)';
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

/**
 * 显示模态框
 */
export function showModal(config: ModalConfig): HTMLElement {
  // 创建模态框元素
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog" style="${config.width ? `width: ${config.width}` : ''}">
      <div class="modal-header">
        <h3 class="modal-title">${config.title}</h3>
        ${config.closable !== false ? '<button class="modal-close">&times;</button>' : ''}
      </div>
      <div class="modal-body">
        ${typeof config.content === 'string' ? config.content : ''}
      </div>
      ${config.buttons ? `
        <div class="modal-footer">
          ${config.buttons.map(btn => `
            <button class="btn btn-${btn.type}" data-action="${btn.label}">
              ${btn.label}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
  
  // 添加样式
  if (!document.getElementById('modal-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .modal-overlay.show {
        opacity: 1;
      }
      
      .modal-dialog {
        background: white;
        border-radius: 8px;
        min-width: 400px;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }
      
      .modal-overlay.show .modal-dialog {
        transform: scale(1);
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #dee2e6;
      }
      
      .modal-title {
        margin: 0;
        font-size: 1.25rem;
      }
      
      .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #999;
      }
      
      .modal-body {
        padding: 1.5rem;
      }
      
      .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid #dee2e6;
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
    `;
    document.head.appendChild(style);
  }
  
  // 添加到页面
  document.body.appendChild(modal);
  
  // 如果内容是HTML元素，则替换
  if (typeof config.content !== 'string') {
    const modalBody = modal.querySelector('.modal-body')!;
    modalBody.innerHTML = '';
    modalBody.appendChild(config.content as HTMLElement);
  }
  
  // 显示动画
  setTimeout(() => {
    modal.classList.add('show');
  }, 100);
  
  // 绑定事件
  modal.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    
    if (target.classList.contains('modal-overlay') || target.classList.contains('modal-close')) {
      if (config.closable !== false) {
        closeModal(modal);
      }
    } else if (target.classList.contains('btn')) {
      const actionLabel = target.getAttribute('data-action');
      const button = config.buttons?.find(b => b.label === actionLabel);
      if (button) {
        try {
          await button.action();
          closeModal(modal);
        } catch (error) {
          console.error('Modal button action failed:', error);
        }
      }
    }
  });
  
  return modal;
}

/**
 * 关闭模态框
 */
export function closeModal(modal: HTMLElement): void {
  modal.classList.remove('show');
  setTimeout(() => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }, 300);
}

/**
 * 显示工具提示
 */
export function showTooltip(element: HTMLElement, config: TooltipConfig): void {
  // 移除旧的工具提示
  const existingTooltip = document.querySelector('.tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
  
  // 创建工具提示元素
  const tooltip = document.createElement('div');
  tooltip.className = `tooltip tooltip-${config.placement}`;
  tooltip.textContent = config.content;
  
  // 添加样式
  if (!document.getElementById('tooltip-styles')) {
    const style = document.createElement('style');
    style.id = 'tooltip-styles';
    style.textContent = `
      .tooltip {
        position: absolute;
        background: #333;
        color: white;
        padding: 0.5rem;
        border-radius: 4px;
        font-size: 0.875rem;
        z-index: 10001;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
        max-width: 200px;
        word-wrap: break-word;
      }
      
      .tooltip.show {
        opacity: 1;
      }
      
      .tooltip::after {
        content: '';
        position: absolute;
        border: 5px solid transparent;
      }
      
      .tooltip-top::after {
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-top-color: #333;
      }
      
      .tooltip-bottom::after {
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-bottom-color: #333;
      }
      
      .tooltip-left::after {
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-left-color: #333;
      }
      
      .tooltip-right::after {
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-right-color: #333;
      }
    `;
    document.head.appendChild(style);
  }
  
  // 添加到页面
  document.body.appendChild(tooltip);
  
  // 计算位置
  const elementRect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  let top = 0;
  let left = 0;
  
  switch (config.placement) {
    case 'top':
      top = elementRect.top - tooltipRect.height - 10;
      left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
      break;
    case 'bottom':
      top = elementRect.bottom + 10;
      left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
      break;
    case 'left':
      top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
      left = elementRect.left - tooltipRect.width - 10;
      break;
    case 'right':
      top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
      left = elementRect.right + 10;
      break;
  }
  
  tooltip.style.top = `${top + window.scrollY}px`;
  tooltip.style.left = `${left + window.scrollX}px`;
  
  // 显示动画
  setTimeout(() => {
    tooltip.classList.add('show');
  }, config.delay || 0);
}

/**
 * 隐藏工具提示
 */
export function hideTooltip(): void {
  const tooltip = document.querySelector('.tooltip');
  if (tooltip) {
    tooltip.classList.remove('show');
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    }, 200);
  }
}

/**
 * 验证邮箱地址
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * 检查文件类型
 */
export function isFileTypeAllowed(file: File, allowedTypes: string[]): boolean {
  const extension = getFileExtension(file.name).toLowerCase();
  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return type.toLowerCase() === `.${extension}`;
    }
    return file.type.includes(type);
  });
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 上传文件
 */
export function uploadFile(options: {
  accept?: string;
  multiple?: boolean;
  onSelect: (files: FileList) => void;
}): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = options.accept || '*';
  input.multiple = options.multiple || false;
  input.style.display = 'none';
  
  input.onchange = (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      options.onSelect(files);
    }
  };
  
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}

/**
 * 获取设备信息
 */
export function getDeviceInfo(): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  platform: string;
  userAgent: string;
} {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;
  
  let platform = 'unknown';
  if (/Windows/i.test(userAgent)) platform = 'windows';
  else if (/Mac/i.test(userAgent)) platform = 'mac';
  else if (/Linux/i.test(userAgent)) platform = 'linux';
  else if (/Android/i.test(userAgent)) platform = 'android';
  else if (/iPhone|iPad|iPod/i.test(userAgent)) platform = 'ios';
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    platform,
    userAgent
  };
}

/**
 * 获取随机颜色
 */
export function getRandomColor(): string {
  const colors = [
    '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
    '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 颜色对比度检查
 */
export function getContrastRatio(color1: string, color2: string): number {
  // 简化实现，实际中需要更复杂的算法
  const getLuminance = (color: string) => {
    // 这里只是示例，实际需要解析颜色值
    return 0.5; // 返回默认值
  };
  
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * 简单的动画函数
 */
export function animate(
  element: HTMLElement,
  properties: Record<string, string>,
  duration = 300,
  easing = 'ease'
): Promise<void> {
  return new Promise((resolve) => {
    const originalTransition = element.style.transition;
    element.style.transition = `all ${duration}ms ${easing}`;
    
    Object.assign(element.style, properties);
    
    setTimeout(() => {
      element.style.transition = originalTransition;
      resolve();
    }, duration);
  });
}

/**
 * 元素可见性检查
 */
export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 滚动到元素
 */
export function scrollToElement(
  element: HTMLElement,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }
): void {
  element.scrollIntoView(options);
}