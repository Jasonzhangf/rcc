/**
 * UI工具函数
 *
 * 提供UI相关的工具函数和帮助方法
 */
import { NotificationConfig, ModalConfig, TooltipConfig } from '../types/ui.types';
/**
 * 生成唯一ID
 */
export declare function generateId(prefix?: string): string;
/**
 * 格式化文件大小
 */
export declare function formatFileSize(bytes: number): string;
/**
 * 格式化日期
 */
export declare function formatDate(date: Date | string | number, format?: string): string;
/**
 * 获取相对时间
 */
export declare function getRelativeTime(date: Date | string | number): string;
/**
 * 防抖函数
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number, immediate?: boolean): (...args: Parameters<T>) => void;
/**
 * 节流函数
 */
export declare function throttle<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * 深拷贝
 */
export declare function deepClone<T>(obj: T): T;
/**
 * 对象比较
 */
export declare function isEqual(obj1: any, obj2: any): boolean;
/**
 * 显示通知
 */
export declare function showNotification(config: NotificationConfig): void;
/**
 * 显示模态框
 */
export declare function showModal(config: ModalConfig): HTMLElement;
/**
 * 关闭模态框
 */
export declare function closeModal(modal: HTMLElement): void;
/**
 * 显示工具提示
 */
export declare function showTooltip(element: HTMLElement, config: TooltipConfig): void;
/**
 * 隐藏工具提示
 */
export declare function hideTooltip(): void;
/**
 * 验证邮箱地址
 */
export declare function isValidEmail(email: string): boolean;
/**
 * 验证URL
 */
export declare function isValidUrl(url: string): boolean;
/**
 * 获取文件扩展名
 */
export declare function getFileExtension(filename: string): string;
/**
 * 检查文件类型
 */
export declare function isFileTypeAllowed(file: File, allowedTypes: string[]): boolean;
/**
 * 复制到剪贴板
 */
export declare function copyToClipboard(text: string): Promise<boolean>;
/**
 * 下载文件
 */
export declare function downloadFile(content: string, filename: string, mimeType?: string): void;
/**
 * 上传文件
 */
export declare function uploadFile(options: {
    accept?: string;
    multiple?: boolean;
    onSelect: (files: FileList) => void;
}): void;
/**
 * 获取设备信息
 */
export declare function getDeviceInfo(): {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    platform: string;
    userAgent: string;
};
/**
 * 获取随机颜色
 */
export declare function getRandomColor(): string;
/**
 * 颜色对比度检查
 */
export declare function getContrastRatio(color1: string, color2: string): number;
/**
 * 简单的动画函数
 */
export declare function animate(element: HTMLElement, properties: Record<string, string>, duration?: number, easing?: string): Promise<void>;
/**
 * 元素可见性检查
 */
export declare function isElementVisible(element: HTMLElement): boolean;
/**
 * 滚动到元素
 */
export declare function scrollToElement(element: HTMLElement, options?: ScrollIntoViewOptions): void;
