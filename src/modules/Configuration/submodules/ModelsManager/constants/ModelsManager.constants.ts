/**
 * ModelsManager Constants
 * All configuration values for models management operations
 * STRICT ANTI-HARDCODING COMPLIANCE
 */

export const MODELS_MANAGER_CONSTANTS = {
  // Module Identity
  MODULE_NAME: 'ModelsManager',
  MODULE_VERSION: '1.0.0',
  
  // API Configuration
  REQUEST_TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  
  // Token Detection Configuration
  TOKEN_DETECTION: {
    // Standard token limits for testing (descending order)
    TEST_TOKEN_LIMITS: [1048576, 524288, 262144, 131072, 65536, 32768, 16384, 8192, 4096, 2048],
    
    // Large token limit to trigger API errors
    TRIGGER_LIMIT_TOKENS: 524288, // 512K tokens
    
    // Token range validation
    MIN_VALID_TOKENS: 1000,
    MAX_VALID_TOKENS: 2000000,
    
    // Test content generation
    CHARS_PER_TOKEN_ESTIMATE: 3, // Conservative estimate for token-to-character ratio
  },
  
  // Model Verification
  VERIFICATION: {
    DEFAULT_TEST_MESSAGE: "Hello, how are you?",
    TOKEN_TEST_MESSAGE: "Hello, please respond with OK.",
    REQUIRED_RESPONSE_MIN_LENGTH: 1,
  },
  
  // iFlow Provider Detection
  IFLOW_DETECTION: {
    URL_PATTERNS: [
      /apis\.iflow\.cn/i,
      /iflow\.cn/i,
      /platform\.iflow\.cn/i
    ],
    NAME_PATTERNS: ['iflow', 'iFlow', 'IFLOW'],
  },
  
  // iFlow Error Parsing Patterns
  IFLOW_TOKEN_PATTERNS: [
    /maximum context length of (\d{1,7}) tokens/i,
    /maximum context length is (\d{1,7}) tokens/i,
    /context[\s_]*length[\s_]*(?:of|is|limit|max)?[:\s]*(\d{1,7})/i,
    /token[\s_]*(?:count[\s_]*)?(?:limit|max)[:\s]*(\d{1,7})/i,
    /(\d{1,7})[\s_]*tokens?[\s_]*(?:limit|max|maximum)/i
  ],
  
  // Generic Error Parsing Patterns
  GENERIC_TOKEN_PATTERNS: [
    /maximum.*?(\d{1,7}).*?tokens/i,
    /token.*?limit.*?(\d{1,7})/i,
    /(\d{1,7}).*?token.*?limit/i
  ],
  
  // Protocol-specific Response Parsing
  PROTOCOLS: {
    OPENAI: {
      NAME: 'openai',
      RESPONSE_PATH: {
        CONTENT: 'choices[0].message.content',
        REASONING_CONTENT: 'choices[0].message.reasoning_content', // GLM-4.5 support
        TOKENS_USED: 'usage.total_tokens'
      }
    },
    ANTHROPIC: {
      NAME: 'anthropic',
      RESPONSE_PATH: {
        CONTENT: 'content[0].text',
        TOKENS_USED: 'usage.output_tokens'
      }
    }
  },
  
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
  },
  
  // Test Content Generation
  TEST_CONTENT: {
    BASE_TEXT: "This is a test message to determine the maximum token limit of the model. ",
    REPEAT_PREFIX: "Repeat ",
    SUFFIX: " Please respond with a simple 'OK'."
  },
  
  // Logging Configuration
  LOGGING: {
    ENABLE_DEBUG: true,
    LOG_RESPONSE_BODIES: false, // Set to true for detailed debugging
    LOG_RAW_RESPONSES: true
  },
  
  // Model Status
  MODEL_STATUS: {
    PENDING: 'pending',
    VERIFIED: 'verified',
    FAILED: 'failed',
    BLACKLISTED: 'blacklisted'
  }
};