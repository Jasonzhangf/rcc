"use strict";
/**
 * RCC - Refactored Claude Code Router
 * 主入口文件 - 包含核心功能模块和启动系统
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleConfigurationManager = exports.ModuleMetadata = exports.ModuleDiscoverySystem = exports.ModuleDependencyError = exports.ModuleLoadError = exports.ModuleLoaderSystem = exports.StartupSystem = exports.RCCStartupSystemInterface = exports.StartupConfig = exports.RCCStartupSystem = exports.DebugSystem = exports.RCCModuleSystem = void 0;
// === 核心系统模块 ===
// 模块系统 - 核心架构
var RCCModuleSystem_1 = require("./RCCModuleSystem");
Object.defineProperty(exports, "RCCModuleSystem", { enumerable: true, get: function () { return RCCModuleSystem_1.RCCModuleSystem; } });
// 调试系统 - 两阶段调试和IO跟踪
var DebugSystem_1 = require("./debug/DebugSystem");
Object.defineProperty(exports, "DebugSystem", { enumerable: true, get: function () { return DebugSystem_1.DebugSystem; } });
__exportStar(require("./debug"), exports);
// 启动系统 - 系统初始化和启动管理
var startup_1 = require("./startup");
Object.defineProperty(exports, "RCCStartupSystem", { enumerable: true, get: function () { return startup_1.RCCStartupSystem; } });
Object.defineProperty(exports, "StartupConfig", { enumerable: true, get: function () { return startup_1.StartupConfig; } });
Object.defineProperty(exports, "RCCStartupSystemInterface", { enumerable: true, get: function () { return startup_1.RCCStartupSystemInterface; } });
var startup_2 = require("./startup");
Object.defineProperty(exports, "StartupSystem", { enumerable: true, get: function () { return startup_2.default; } });
// === 工具模块 ===
// 模块加载和管理系统
var ModuleLoaderSystem_1 = require("./utils/ModuleLoaderSystem");
Object.defineProperty(exports, "ModuleLoaderSystem", { enumerable: true, get: function () { return ModuleLoaderSystem_1.ModuleLoaderSystem; } });
Object.defineProperty(exports, "ModuleLoadError", { enumerable: true, get: function () { return ModuleLoaderSystem_1.ModuleLoadError; } });
Object.defineProperty(exports, "ModuleDependencyError", { enumerable: true, get: function () { return ModuleLoaderSystem_1.ModuleDependencyError; } });
var ModuleDiscoverySystem_1 = require("./utils/ModuleDiscoverySystem");
Object.defineProperty(exports, "ModuleDiscoverySystem", { enumerable: true, get: function () { return ModuleDiscoverySystem_1.ModuleDiscoverySystem; } });
Object.defineProperty(exports, "ModuleMetadata", { enumerable: true, get: function () { return ModuleDiscoverySystem_1.ModuleMetadata; } });
var ModuleConfigurationManager_1 = require("./utils/ModuleConfigurationManager");
Object.defineProperty(exports, "ModuleConfigurationManager", { enumerable: true, get: function () { return ModuleConfigurationManager_1.ModuleConfigurationManager; } });
// ===== 默认导出 - 完整的RCC系统 =====
var RCCModuleSystem_2 = require("./RCCModuleSystem");
var DebugSystem_2 = require("./debug/DebugSystem");
var startup_3 = require("./startup");
var ModuleLoaderSystem_2 = require("./utils/ModuleLoaderSystem");
var ModuleDiscoverySystem_2 = require("./utils/ModuleDiscoverySystem");
var ModuleConfigurationManager_2 = require("./utils/ModuleConfigurationManager");
/**
 * 完整的RCC系统默认导出
 * 提供所有核心功能的一站式访问
 */
var RCCSystem = {
    // 核心系统
    RCCModuleSystem: RCCModuleSystem_2.RCCModuleSystem,
    DebugSystem: DebugSystem_2.DebugSystem,
    RCCStartupSystem: startup_3.RCCStartupSystem,
    // 工具模块
    ModuleLoaderSystem: ModuleLoaderSystem_2.ModuleLoaderSystem,
    ModuleDiscoverySystem: ModuleDiscoverySystem_2.ModuleDiscoverySystem,
    ModuleConfigurationManager: ModuleConfigurationManager_2.ModuleConfigurationManager,
    // 创建完整系统的工厂函数
    createSystem: function () {
        return {
            moduleSystem: new RCCModuleSystem_2.RCCModuleSystem(),
            debugSystem: new DebugSystem_2.DebugSystem(),
            startupSystem: new startup_3.RCCStartupSystem(),
        };
    },
};
exports.default = RCCSystem;
