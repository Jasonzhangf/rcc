"use strict";
/**
 * 配置解析器
 *
 * 负责将原始配置数据解析为标准化的ConfigData结构
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigParser = void 0;
var fs = require("fs/promises");
/**
 * 配置解析器类
 */
var ConfigParser = /** @class */ (function () {
    function ConfigParser() {
        this.initialized = false;
    }
    /**
     * 初始化解析器
     */
    ConfigParser.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.initialized) {
                    return [2 /*return*/];
                }
                this.initialized = true;
                console.log('ConfigParser initialized successfully');
                return [2 /*return*/];
            });
        });
    };
    /**
     * 解析配置数据
     */
    ConfigParser.prototype.parseConfig = function (rawData) {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                try {
                    config = {
                        version: rawData.version || '1.0.0',
                        providers: {},
                        virtualModels: {},
                        createdAt: rawData.createdAt || new Date().toISOString(),
                        updatedAt: rawData.updatedAt || new Date().toISOString()
                    };
                    // 解析供应商配置
                    if (rawData.providers) {
                        config.providers = this.parseProviders(rawData.providers);
                    }
                    // 解析虚拟模型配置
                    if (rawData.virtualModels) {
                        config.virtualModels = this.parseVirtualModels(rawData.virtualModels);
                    }
                    // 更新时间戳
                    config.updatedAt = new Date().toISOString();
                    console.log('Configuration parsed successfully');
                    return [2 /*return*/, config];
                }
                catch (error) {
                    console.error('Failed to parse configuration:', error);
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 解析供应商配置
     */
    ConfigParser.prototype.parseProviders = function (rawProviders) {
        var _a, _b;
        var providers = {};
        for (var _i = 0, _c = Object.entries(rawProviders); _i < _c.length; _i++) {
            var _d = _c[_i], providerId = _d[0], rawProvider = _d[1];
            if (typeof rawProvider !== 'object' || rawProvider === null) {
                continue;
            }
            var provider = {
                id: providerId,
                name: rawProvider.name || providerId,
                type: rawProvider.type || 'unknown',
                endpoint: rawProvider.endpoint,
                models: {},
                auth: {
                    type: ((_a = rawProvider.auth) === null || _a === void 0 ? void 0 : _a.type) || 'api-key',
                    keys: Array.isArray((_b = rawProvider.auth) === null || _b === void 0 ? void 0 : _b.keys) ? rawProvider.auth.keys : []
                }
            };
            // 解析模型配置
            if (rawProvider.models) {
                provider.models = this.parseModels(rawProvider.models);
            }
            providers[providerId] = provider;
        }
        return providers;
    };
    /**
     * 解析模型配置
     */
    ConfigParser.prototype.parseModels = function (rawModels) {
        var models = {};
        for (var _i = 0, _a = Object.entries(rawModels); _i < _a.length; _i++) {
            var _b = _a[_i], modelId = _b[0], rawModel = _b[1];
            if (typeof rawModel !== 'object' || rawModel === null) {
                continue;
            }
            var model = {
                id: modelId,
                name: rawModel.name || modelId,
                contextLength: rawModel.contextLength,
                supportsFunctions: rawModel.supportsFunctions
            };
            models[modelId] = model;
        }
        return models;
    };
    /**
     * 解析虚拟模型配置
     */
    ConfigParser.prototype.parseVirtualModels = function (rawVirtualModels) {
        var virtualModels = {};
        for (var _i = 0, _a = Object.entries(rawVirtualModels); _i < _a.length; _i++) {
            var _b = _a[_i], vmId = _b[0], rawVm = _b[1];
            if (typeof rawVm !== 'object' || rawVm === null) {
                continue;
            }
            // 处理targets数组
            var targets = [];
            if (Array.isArray(rawVm.targets)) {
                targets = rawVm.targets.map(function (target) { return ({
                    providerId: target.providerId || '',
                    modelId: target.modelId || '',
                    keyIndex: target.keyIndex || 0
                }); });
            }
            else if (rawVm.targetProvider && rawVm.targetModel) {
                // 兼容旧格式，转换为新格式
                targets = [{
                        providerId: rawVm.targetProvider || '',
                        modelId: rawVm.targetModel || '',
                        keyIndex: rawVm.keyIndex || 0
                    }];
            }
            else {
                // 默认空目标
                targets = [{
                        providerId: '',
                        modelId: '',
                        keyIndex: 0
                    }];
            }
            var virtualModel = {
                id: vmId,
                targets: targets,
                enabled: rawVm.enabled !== false,
                priority: rawVm.priority || 1
            };
            virtualModels[vmId] = virtualModel;
        }
        return virtualModels;
    };
    /**
     * 从文件解析配置
     *
     * @param configPath 配置文件路径
     * @param options 预处理选项
     * @returns 解析后的配置数据
     */
    ConfigParser.prototype.parseConfigFromFile = function (configPath, options) {
        return __awaiter(this, void 0, void 0, function () {
            var opts, rawData, config, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        opts = __assign({ substituteEnvVars: true, processTemplates: true, validateData: true, enableCaching: true }, options);
                        return [4 /*yield*/, this.readFile(configPath)];
                    case 1:
                        rawData = _a.sent();
                        return [4 /*yield*/, this.preprocessConfig(rawData, opts)];
                    case 2:
                        // 步骤2: 预处理数据
                        rawData = _a.sent();
                        return [4 /*yield*/, this.parseConfig(rawData)];
                    case 3:
                        config = _a.sent();
                        console.log("Configuration parsed successfully from ".concat(configPath));
                        return [2 /*return*/, config];
                    case 4:
                        error_1 = _a.sent();
                        console.error("Failed to parse configuration from ".concat(configPath, ":"), error_1);
                        throw error_1;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 预处理配置数据
     *
     * @param rawData 原始配置数据
     * @param options 预处理选项
     * @returns 预处理后的数据
     */
    ConfigParser.prototype.preprocessConfig = function (rawData, options) {
        return __awaiter(this, void 0, void 0, function () {
            var opts, processedData;
            return __generator(this, function (_a) {
                opts = __assign({ substituteEnvVars: true, processTemplates: true, validateData: true }, options);
                processedData = rawData;
                // 步骤1: 环境变量替换
                if (opts.substituteEnvVars) {
                    processedData = this.substituteEnvVars(processedData);
                }
                // 步骤2: 模板处理
                if (opts.processTemplates) {
                    processedData = this.processTemplates(processedData);
                }
                // 步骤3: 自定义处理器
                if (opts.customProcessors && opts.customProcessors.length > 0) {
                    processedData = this.applyCustomProcessors(processedData, opts.customProcessors);
                }
                // 步骤4: 验证
                if (opts.validateData) {
                    this.validatePreprocessedData(processedData);
                }
                return [2 /*return*/, processedData];
            });
        });
    };
    /**
     * 翻译配置
     *
     * @param config 配置数据
     * @param locale 语言环境
     * @returns 翻译后的配置数据
     */
    ConfigParser.prototype.translateConfig = function (config, locale) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // 占位符，用于翻译实现
                if (locale) {
                    console.log("Translation to locale ".concat(locale, " requested but not implemented"));
                }
                return [2 /*return*/, config];
            });
        });
    };
    /**
     * 读取配置文件
     *
     * @param configPath 配置文件路径
     * @returns 解析后的文件内容
     */
    ConfigParser.prototype.readFile = function (configPath) {
        return __awaiter(this, void 0, void 0, function () {
            var content, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        // 检查文件是否存在
                        return [4 /*yield*/, fs.access(configPath)];
                    case 1:
                        // 检查文件是否存在
                        _a.sent();
                        return [4 /*yield*/, fs.readFile(configPath, 'utf-8')];
                    case 2:
                        content = _a.sent();
                        // 根据文件扩展名解析
                        if (configPath.endsWith('.json')) {
                            return [2 /*return*/, JSON.parse(content)];
                        }
                        else if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
                            // YAML支持需要额外的包
                            throw new Error('YAML support not implemented');
                        }
                        else {
                            // 默认为JSON
                            return [2 /*return*/, JSON.parse(content)];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        if (error_2.code === 'ENOENT') {
                            throw new Error("Configuration file not found: ".concat(configPath));
                        }
                        throw new Error("Failed to read configuration file ".concat(configPath, ": ").concat(error_2));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 环境变量替换
     *
     * @param data 配置数据
     * @returns 替换环境变量后的数据
     */
    ConfigParser.prototype.substituteEnvVars = function (data) {
        var _this = this;
        if (typeof data === 'string') {
            return data.replace(/\$\{([^}]+)\}/g, function (match, envVar) {
                return process.env[envVar] || match;
            });
        }
        else if (Array.isArray(data)) {
            return data.map(function (item) { return _this.substituteEnvVars(item); });
        }
        else if (typeof data === 'object' && data !== null) {
            var result = {};
            for (var _i = 0, _a = Object.entries(data); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                result[key] = this.substituteEnvVars(value);
            }
            return result;
        }
        return data;
    };
    /**
     * 模板处理
     *
     * @param data 配置数据
     * @returns 处理模板后的数据
     */
    ConfigParser.prototype.processTemplates = function (data) {
        var _this = this;
        // 基本模板处理
        // 支持简单的变量插值: {{variable}}
        if (typeof data === 'string') {
            return data.replace(/\{\{([^}]+)\}\}/g, function (match, variable) {
                // 简单的变量查找，可以从环境变量或预定义变量中获取
                return process.env[variable.trim()] || match;
            });
        }
        else if (Array.isArray(data)) {
            return data.map(function (item) { return _this.processTemplates(item); });
        }
        else if (typeof data === 'object' && data !== null) {
            var result = {};
            for (var _i = 0, _a = Object.entries(data); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                result[key] = this.processTemplates(value);
            }
            return result;
        }
        return data;
    };
    /**
     * 验证预处理的数据
     *
     * @param data 预处理后的数据
     * @returns 验证是否通过
     */
    ConfigParser.prototype.validatePreprocessedData = function (data) {
        // 基本验证检查
        if (!data || typeof data !== 'object') {
            throw new Error('Configuration data must be an object');
        }
        // 检查必需字段
        if (data.providers !== undefined && typeof data.providers !== 'object') {
            throw new Error('Configuration providers must be an object');
        }
        if (data.virtualModels !== undefined && typeof data.virtualModels !== 'object') {
            throw new Error('Configuration virtualModels must be an object');
        }
        // 验证供应商配置结构
        if (data.providers) {
            for (var _i = 0, _a = Object.entries(data.providers); _i < _a.length; _i++) {
                var _b = _a[_i], providerId = _b[0], provider = _b[1];
                if (typeof provider !== 'object' || provider === null) {
                    throw new Error("Provider ".concat(providerId, " must be an object"));
                }
                // 检查必需字段
                if (!provider.name) {
                    console.warn("Provider ".concat(providerId, " missing name field"));
                }
                if (!provider.type) {
                    console.warn("Provider ".concat(providerId, " missing type field"));
                }
                // 验证模型结构
                if (provider.models !== undefined && typeof provider.models !== 'object') {
                    throw new Error("Provider ".concat(providerId, " models must be an object"));
                }
                if (provider.models) {
                    for (var _c = 0, _d = Object.entries(provider.models); _c < _d.length; _c++) {
                        var _e = _d[_c], modelId = _e[0], model = _e[1];
                        if (typeof model !== 'object' || model === null) {
                            throw new Error("Model ".concat(modelId, " in provider ").concat(providerId, " must be an object"));
                        }
                        if (!model.name) {
                            console.warn("Model ".concat(modelId, " in provider ").concat(providerId, " missing name field"));
                        }
                    }
                }
            }
        }
        // 验证虚拟模型配置结构
        if (data.virtualModels) {
            for (var _f = 0, _g = Object.entries(data.virtualModels); _f < _g.length; _f++) {
                var _h = _g[_f], vmId = _h[0], vm = _h[1];
                if (typeof vm !== 'object' || vm === null) {
                    throw new Error("Virtual model ".concat(vmId, " must be an object"));
                }
                // 检查targets数组
                if (vm.targets !== undefined && !Array.isArray(vm.targets)) {
                    throw new Error("Virtual model ".concat(vmId, " targets must be an array"));
                }
                if (vm.targets) {
                    for (var i = 0; i < vm.targets.length; i++) {
                        var target = vm.targets[i];
                        if (typeof target !== 'object' || target === null) {
                            throw new Error("Virtual model ".concat(vmId, " target ").concat(i, " must be an object"));
                        }
                        if (!target.providerId) {
                            console.warn("Virtual model ".concat(vmId, " target ").concat(i, " missing providerId"));
                        }
                        if (!target.modelId) {
                            console.warn("Virtual model ".concat(vmId, " target ").concat(i, " missing modelId"));
                        }
                    }
                }
            }
        }
        return true;
    };
    /**
     * 应用自定义处理器
     *
     * @param data 配置数据
     * @param processors 自定义处理器函数数组
     * @returns 处理后的数据
     */
    ConfigParser.prototype.applyCustomProcessors = function (data, processors) {
        var processedData = data;
        for (var _i = 0, processors_1 = processors; _i < processors_1.length; _i++) {
            var processor = processors_1[_i];
            if (typeof processor === 'function') {
                processedData = processor(processedData);
            }
        }
        return processedData;
    };
    /**
     * 销毁解析器
     */
    ConfigParser.prototype.destroy = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.initialized = false;
                console.log('ConfigParser destroyed successfully');
                return [2 /*return*/];
            });
        });
    };
    return ConfigParser;
}());
exports.ConfigParser = ConfigParser;
