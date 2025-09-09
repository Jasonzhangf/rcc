#!/usr/bin/env node

/**
 * 更新为官方iFlow模型列表配置
 * 基于官方文档: https://platform.iflow.cn/models
 */

const fs = require('fs');
const path = require('path');

// 官方iFlow模型列表 - 根据官方文档精确配置
const OFFICIAL_IFLOW_MODELS = [
  {
    id: 'tstars2.0',
    name: 'tstars2.0', 
    max_tokens: 131072, // 128K context window
    description: '🔥 TStars-2.0: Taobao Star Language Model jointly developed by Taobao Group and Aicheng Technology, trained with over 10T tokens.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'qwen3-coder',
    name: 'qwen3-coder',
    max_tokens: 262144, // 256K context window  
    description: '🔥 Qwen3-Coder-480B-A35B: Significant performance on Agentic Coding, native support for 256K tokens, extendable up to 1M tokens.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'qwen3-max-preview',
    name: 'qwen3-max-preview',
    max_tokens: 262144, // 256K context window
    description: '🔥 Qwen3-Max-Preview: Substantial improvements in general capabilities, text understanding, complex instructions, and tool-use abilities.',
    status: 'active', 
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'kimi-k2-0905',
    name: 'kimi-k2-0905',
    max_tokens: 262144, // 256K context window
    description: '🔥 Kimi-K2-Instruct-0905: Latest, most capable version of Kimi K2. State-of-the-art MoE model with 32B activated and 1T total parameters.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'glm-4.5',
    name: 'glm-4.5',
    max_tokens: 131072, // 128K context window
    description: '🔥 GLM-4.5: Foundation models designed for intelligent agents. 355B total parameters with 32B active parameters.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'kimi-k2',
    name: 'kimi-k2',
    max_tokens: 131072, // 128K context window
    description: '🔥 Kimi-K2: State-of-the-art MoE language model with 32B activated and 1T total parameters, optimized for agentic capabilities.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'deepseek-v3.1',
    name: 'deepseek-v3.1',
    max_tokens: 131072, // 128K context window
    description: '🔥 DeepSeek-V3.1: Hybrid inference Think & Non-Think modes, faster thinking, stronger agent skills.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'deepseek-r1',
    name: 'deepseek-r1',
    max_tokens: 131072, // 128K context window (注意: Max Output 32K)
    description: '🔥 DeepSeek-R1: Trained via large-scale RL, performance comparable to OpenAI-o1 across math, code, and reasoning tasks.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'deepseek-v3',
    name: 'deepseek-v3',
    max_tokens: 131072, // 128K context window (注意: Max Output 32K)
    description: '🔥 DeepSeek-V3-671B: Strong MoE language model with 671B total parameters, 37B activated per token.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'qwen3-32b',
    name: 'qwen3-32b', 
    max_tokens: 131072, // 128K context window (注意: Max Output 32K)
    description: 'Qwen3-32B: Latest generation model with comprehensive dense and MoE models, groundbreaking advancements in reasoning.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'qwen3-235b-a22b-thinking-2507',
    name: 'qwen3-235b-a22b-thinking-2507',
    max_tokens: 262144, // 256K context window
    description: 'Qwen3-235B-A22B-Thinking-2507: State-of-the-art reasoning model with significantly improved performance on logical reasoning, mathematics, science.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'qwen3-235b-a22b-instruct',
    name: 'qwen3-235b-a22b-instruct',
    max_tokens: 262144, // 256K context window
    description: 'Qwen3-235B-A22B-Instruct-2507: Significant improvements in instruction following, logical reasoning, text comprehension, mathematics, science.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'qwen3-235b',
    name: 'qwen3-235b',
    max_tokens: 131072, // 128K context window (注意: Max Output 32K)
    description: 'Qwen3-235B-A22B: Seamless switching between thinking and non-thinking modes, expertise in agent capabilities, 100+ languages support.',
    status: 'active',
    verified: false,
    auto_detected_tokens: null,
    blacklisted: false,
    blacklist_reason: null,
    manual_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// 配置文件路径
const CONFIG_PATH = '/Users/fanzhang/.rcc/config.json';

async function updateIFlowModels() {
  try {
    console.log('🔄 开始更新iFlow官方模型配置...\n');
    
    // 读取当前配置
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configData);
    
    // 找到iFlow provider
    const iflowProvider = config.providers.find(p => p.name === 'iflow');
    if (!iflowProvider) {
      throw new Error('找不到iFlow provider配置');
    }
    
    // 保留有用的现有数据（验证状态等）
    const existingModelsMap = new Map();
    iflowProvider.models.forEach(model => {
      existingModelsMap.set(model.id, model);
    });
    
    console.log('📊 官方模型统计:');
    console.log(`   - 总计: ${OFFICIAL_IFLOW_MODELS.length} 个官方模型`);
    console.log(`   - 256K models: ${OFFICIAL_IFLOW_MODELS.filter(m => m.max_tokens === 262144).length} 个`);
    console.log(`   - 128K models: ${OFFICIAL_IFLOW_MODELS.filter(m => m.max_tokens === 131072).length} 个\n`);
    
    // 更新模型配置
    iflowProvider.models = OFFICIAL_IFLOW_MODELS.map(officialModel => {
      const existingModel = existingModelsMap.get(officialModel.id) || 
                           existingModelsMap.get(officialModel.name) ||
                           // 处理名称变更的情况
                           (officialModel.id === 'qwen3-coder' ? existingModelsMap.get('Qwen3-Coder') : null);
      
      if (existingModel) {
        console.log(`✅ 更新模型: ${officialModel.id}`);
        return {
          ...officialModel,
          // 保留验证状态和检测数据
          verified: existingModel.verified || false,
          auto_detected_tokens: existingModel.auto_detected_tokens,
          last_verification: existingModel.last_verification,
          // 保留黑名单状态（如果手动设置）
          blacklisted: existingModel.blacklisted || false,
          blacklist_reason: existingModel.blacklist_reason,
          // 更新时间
          updated_at: new Date().toISOString()
        };
      } else {
        console.log(`🆕 新增模型: ${officialModel.id}`);
        return officialModel;
      }
    });
    
    // 更新全局配置时间戳
    config.last_updated = new Date().toISOString();
    config.version = "2.0.0"; // 标记为新版本
    
    // 写入配置文件
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    console.log(`\n✅ 配置更新完成!`);
    console.log(`📁 配置文件: ${CONFIG_PATH}`);
    console.log(`🕒 更新时间: ${config.last_updated}`);
    
    // 显示模型分类统计
    console.log('\n📋 模型分类统计:');
    const activeModels = iflowProvider.models.filter(m => !m.blacklisted);
    const blacklistedModels = iflowProvider.models.filter(m => m.blacklisted);
    const verifiedModels = iflowProvider.models.filter(m => m.verified);
    
    console.log(`   - 活跃模型: ${activeModels.length} 个`);
    console.log(`   - 黑名单模型: ${blacklistedModels.length} 个`);
    console.log(`   - 已验证模型: ${verifiedModels.length} 个`);
    
    // 显示按上下文长度分组
    console.log('\n📏 按上下文长度分组:');
    const contextGroups = {};
    iflowProvider.models.forEach(model => {
      const contextSize = model.max_tokens;
      if (!contextGroups[contextSize]) contextGroups[contextSize] = [];
      contextGroups[contextSize].push(model.id);
    });
    
    Object.keys(contextGroups).sort((a, b) => b - a).forEach(contextSize => {
      const sizeLabel = contextSize == 262144 ? '256K' : contextSize == 131072 ? '128K' : contextSize;
      console.log(`   - ${sizeLabel}: ${contextGroups[contextSize].length} 个模型`);
      console.log(`     ${contextGroups[contextSize].join(', ')}`);
    });
    
    console.log('\n🎉 官方iFlow模型配置更新完成！');
    
  } catch (error) {
    console.error('❌ 配置更新失败:', error.message);
    process.exit(1);
  }
}

// 运行更新
if (require.main === module) {
  updateIFlowModels();
}

module.exports = { OFFICIAL_IFLOW_MODELS, updateIFlowModels };