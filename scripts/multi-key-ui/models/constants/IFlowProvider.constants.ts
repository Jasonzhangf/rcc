/**
 * iFlow Provider Constants
 * Specific configurations and patterns for iFlow API integration
 */

export const IFLOW_CONSTANTS = {
  // iFlow API Error Patterns for Token Detection
  ERROR_PATTERNS: [
    /maximum context length of (\d{1,7}) tokens/i,
    /maximum context length is (\d{1,7}) tokens/i,
    /context[\s_]*length[\s_]*(?:of|is|limit|max)?[:\s]*(\d{1,7})/i,
    /token[\s_]*(?:count[\s_]*)?(?:limit|max)[:\s]*(\d{1,7})/i,
    /(\d{1,7})[\s_]*tokens?[\s_]*(?:limit|max|maximum)/i
  ],

  // iFlow Error Response Format: {"message": "...", "error_code": 400}
  ERROR_FORMAT: {
    MESSAGE_PATH: 'message',
    ERROR_CODE_PATH: 'error_code', 
    EXPECTED_ERROR_CODE: 400,
    FALLBACK_OPENAI_PATH: 'error.message' // For OpenAI compatibility
  },

  // iFlow Provider Detection
  PROVIDER_DETECTION: {
    URL_PATTERNS: [
      /apis\.iflow\.cn/i,
      /iflow\.cn/i,
      /platform\.iflow\.cn/i
    ],
    PROVIDER_NAMES: ['iflow', 'iFlow', 'IFLOW'],
    API_BASE_PATTERNS: [
      'https://apis.iflow.cn/v1/chat/completions',
      'https://apis.iflow.cn/v1'
    ]
  },

  // Token Limit Test Strategy (from high to low)
  TEST_TOKEN_LIMITS: [
    524288,  // 512K - Trigger most errors
    262144,  // 256K
    131072,  // 128K - Common iFlow limit
    65536,   // 64K
    32768,   // 32K
    16384,   // 16K
    8192,    // 8K
    4096     // 4K - Minimal test
  ],

  // iFlow Model Information (from API documentation)
  KNOWN_MODELS: {
    'qwen-turbo': { max_tokens: 131072, description: '通义千问Turbo模型' },
    'qwen-plus': { max_tokens: 131072, description: '通义千问Plus模型' },
    'qwen-max': { max_tokens: 8192, description: '通义千问Max模型' },
    'qwen3-coder': { max_tokens: 131072, description: '通义千问3代码模型' },
    'qwen2.5-72b-instruct': { max_tokens: 131072, description: '通义千问2.5 72B' },
    'qwen2.5-32b-instruct': { max_tokens: 131072, description: '通义千问2.5 32B' },
    'qwen2.5-14b-instruct': { max_tokens: 131072, description: '通义千问2.5 14B' },
    'qwen2.5-7b-instruct': { max_tokens: 131072, description: '通义千问2.5 7B' },
    'deepseek-v3': { max_tokens: 131072, description: 'DeepSeek V3 MoE模型' },
    'deepseek-r1': { max_tokens: 131072, description: 'DeepSeek R1推理模型' },
    'deepseek-v3.1': { max_tokens: 131072, description: 'DeepSeek V3.1混合推理' },
    'kimi-k2': { max_tokens: 131072, description: 'Kimi K2 MoE模型' },
    'glm-4.5': { max_tokens: 131072, description: 'GLM-4.5智能体模型' },
    'qwen3-max-preview': { max_tokens: 262144, description: '通义千问3 Max预览版' },
    'Qwen3-Coder': { max_tokens: 262144, description: 'Qwen3代码生成模型' }
  },

  // Request Configuration for iFlow API
  REQUEST_CONFIG: {
    DEFAULT_TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    USER_AGENT: 'RCC-MultiKey-UI/1.0',
    HEADERS: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },

  // Validation Rules
  VALIDATION: {
    MIN_TOKEN_LIMIT: 1000,
    MAX_TOKEN_LIMIT: 2000000,
    VALID_STATUS_CODES: [200, 400, 401, 403, 429, 500]
  }
};