/**
 * Test Data Fixtures for Configuration Persistence Module Tests
 * 
 * Provides comprehensive test data sets for various testing scenarios
 * following RCC governance rules for test data organization
 */

import { 
  ConfigurationMetadata, 
  ConfigurationFormat,
  BackupRetentionPolicy,
  RetentionStrategy 
} from '../../interfaces/IConfigPersistenceModule';

export const testData = {
  /**
   * Sample configuration objects for testing different scenarios
   */
  sampleConfigurations: {
    /**
     * Basic configuration for simple tests
     */
    basic: {
      name: 'test-config',
      version: '1.0.0',
      environment: 'test',
      settings: {
        enabled: true,
        timeout: 5000,
        retries: 3
      },
      features: ['feature1', 'feature2'],
      metadata: {
        created: '2024-01-01T00:00:00Z',
        author: 'test-suite'
      }
    },

    /**
     * Complex configuration with nested structures
     */
    complex: {
      application: {
        name: 'test-application',
        version: '2.1.0',
        description: 'Complex test configuration',
        modules: {
          authentication: {
            enabled: true,
            providers: ['oauth', 'ldap', 'local'],
            settings: {
              sessionTimeout: 3600,
              maxRetries: 5,
              lockoutDuration: 900
            },
            oauth: {
              clientId: 'test-client-id',
              scopes: ['read', 'write', 'admin'],
              endpoints: {
                auth: 'https://auth.example.com/oauth/authorize',
                token: 'https://auth.example.com/oauth/token',
                userinfo: 'https://auth.example.com/oauth/userinfo'
              }
            }
          },
          database: {
            type: 'postgresql',
            host: 'localhost',
            port: 5432,
            database: 'test_db',
            username: 'test_user',
            ssl: {
              enabled: true,
              cert: '/path/to/cert.pem',
              key: '/path/to/key.pem',
              ca: '/path/to/ca.pem'
            },
            pool: {
              min: 2,
              max: 10,
              acquireTimeoutMillis: 60000,
              createTimeoutMillis: 30000,
              destroyTimeoutMillis: 5000,
              idleTimeoutMillis: 30000,
              reapIntervalMillis: 1000,
              createRetryIntervalMillis: 200
            }
          },
          logging: {
            level: 'info',
            format: 'json',
            outputs: ['console', 'file'],
            file: {
              path: '/var/log/application.log',
              maxSize: '100MB',
              maxFiles: 5,
              compress: true
            },
            console: {
              colorize: true,
              timestamp: true
            }
          }
        },
        features: {
          rateLimiting: {
            enabled: true,
            windowMs: 900000,
            max: 100,
            message: 'Too many requests',
            standardHeaders: true,
            legacyHeaders: false
          },
          cors: {
            enabled: true,
            origin: ['http://localhost:3000', 'https://app.example.com'],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
          },
          monitoring: {
            enabled: true,
            metrics: {
              enabled: true,
              endpoint: '/metrics',
              interval: 30000
            },
            healthCheck: {
              enabled: true,
              endpoint: '/health',
              timeout: 5000
            },
            tracing: {
              enabled: true,
              serviceName: 'test-application',
              sampleRate: 0.1
            }
          }
        }
      },
      environment: 'test',
      deployment: {
        region: 'us-west-2',
        stage: 'development',
        version: '1.2.3',
        replicas: 2,
        resources: {
          cpu: '500m',
          memory: '1Gi',
          storage: '10Gi'
        }
      }
    },

    /**
     * Large configuration for performance testing
     */
    large: (() => {
      const config: any = {
        metadata: {
          name: 'large-test-config',
          version: '1.0.0',
          description: 'Large configuration for performance testing'
        },
        sections: {}
      };

      // Generate 100 sections with 50 properties each
      for (let section = 0; section < 100; section++) {
        config.sections[`section_${section}`] = {};
        for (let prop = 0; prop < 50; prop++) {
          config.sections[`section_${section}`][`property_${prop}`] = {
            value: `test_value_${section}_${prop}`,
            type: prop % 4 === 0 ? 'string' : prop % 4 === 1 ? 'number' : prop % 4 === 2 ? 'boolean' : 'array',
            metadata: {
              created: new Date().toISOString(),
              version: Math.floor(Math.random() * 10) + 1,
              tags: [`tag${prop % 5}`, `section${section}`, 'generated']
            }
          };
        }
      }

      return config;
    })(),

    /**
     * Configuration with various data types
     */
    dataTypes: {
      strings: {
        empty: '',
        simple: 'hello world',
        multiline: 'line 1\nline 2\nline 3',
        unicode: 'Hello 世界 🌍',
        special: 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
        json: '{"embedded": "json", "number": 42}',
        xml: '<root><element>value</element></root>',
        base64: 'SGVsbG8gV29ybGQ='
      },
      numbers: {
        integer: 42,
        negative: -123,
        zero: 0,
        float: 3.14159,
        scientific: 1.23e-4,
        infinity: Infinity,
        large: Number.MAX_SAFE_INTEGER
      },
      booleans: {
        true: true,
        false: false
      },
      arrays: {
        empty: [],
        strings: ['a', 'b', 'c'],
        numbers: [1, 2, 3, 4, 5],
        mixed: [1, 'two', true, null, { key: 'value' }],
        nested: [[1, 2], [3, 4], [5, 6]],
        large: new Array(1000).fill(0).map((_, i) => i)
      },
      objects: {
        empty: {},
        simple: { key: 'value' },
        nested: {
          level1: {
            level2: {
              level3: {
                deep: 'value'
              }
            }
          }
        },
        complex: {
          user: {
            id: 123,
            name: 'John Doe',
            email: 'john@example.com',
            preferences: {
              theme: 'dark',
              language: 'en',
              notifications: {
                email: true,
                push: false,
                sms: true
              }
            },
            roles: ['user', 'admin'],
            metadata: {
              createdAt: '2024-01-01T00:00:00Z',
              lastLogin: '2024-01-15T14:30:00Z',
              loginCount: 42
            }
          }
        }
      },
      nullAndUndefined: {
        null: null,
        explicitUndefined: undefined
      }
    },

    /**
     * Invalid configurations for error testing
     */
    invalid: {
      circular: (() => {
        const obj: any = { name: 'circular' };
        obj.self = obj;
        return obj;
      })(),
      
      // These would be caught during serialization
      withFunctions: {
        name: 'invalid',
        fn: function() { return 'test'; },
        arrow: () => 'test'
      },

      withSymbols: {
        name: 'invalid',
        [Symbol('test')]: 'symbol-value'
      }
    },

    /**
     * Configurations in different formats for format testing
     */
    formats: {
      json: {
        format: 'json',
        data: { key: 'value', number: 42, array: [1, 2, 3] }
      },
      yaml: {
        format: 'yaml',
        data: {
          server: {
            host: 'localhost',
            port: 8080
          },
          database: {
            url: 'postgresql://localhost:5432/db',
            pool: { max: 10, min: 2 }
          }
        }
      },
      toml: {
        format: 'toml',
        data: {
          title: 'TOML Example',
          owner: {
            name: 'Tom Preston-Werner',
            dob: '1979-05-27T07:32:00-08:00'
          },
          database: {
            server: '192.168.1.1',
            ports: [8001, 8001, 8002],
            connection_max: 5000,
            enabled: true
          }
        }
      }
    }
  },

  /**
   * Sample metadata objects for testing
   */
  sampleMetadata: {
    basic: {
      version: '1.0.0',
      createdAt: Date.now() - 86400000, // 1 day ago
      modifiedAt: Date.now(),
      checksum: 'abc123def456',
      fileSize: 1024,
      encoding: 'utf8',
      format: ConfigurationFormat.JSON
    } as ConfigurationMetadata,

    withOptionalFields: {
      version: '2.1.0',
      createdAt: Date.now() - 172800000, // 2 days ago
      modifiedAt: Date.now() - 3600000, // 1 hour ago
      createdBy: 'test-user',
      modifiedBy: 'admin-user',
      description: 'Test configuration with metadata',
      tags: ['test', 'development', 'v2'],
      schema: 'app-config-v2',
      environment: 'development',
      checksum: 'xyz789uvw012',
      fileSize: 2048,
      encoding: 'utf8',
      format: ConfigurationFormat.YAML,
      customFields: {
        project: 'test-project',
        team: 'platform',
        cost_center: 'engineering'
      }
    } as ConfigurationMetadata
  },

  /**
   * Sample backup retention policies
   */
  backupPolicies: {
    default: {
      maxCount: 3,
      maxAgeHours: 168, // 7 days
      compressionEnabled: true,
      retentionStrategy: RetentionStrategy.FIFO
    } as BackupRetentionPolicy,

    strict: {
      maxCount: 10,
      maxAgeHours: 720, // 30 days
      compressionEnabled: true,
      retentionStrategy: RetentionStrategy.PRIORITY_BASED,
      priorityRules: [
        {
          condition: 'automated_backup',
          priority: 1,
          action: 'delete' as any,
          description: 'Delete automated backups first'
        },
        {
          condition: 'size > 10MB',
          priority: 2,
          action: 'compress' as any,
          description: 'Compress large backups'
        }
      ]
    } as BackupRetentionPolicy,

    minimal: {
      maxCount: 1,
      maxAgeHours: 24, // 1 day
      compressionEnabled: false,
      retentionStrategy: RetentionStrategy.LIFO
    } as BackupRetentionPolicy
  },

  /**
   * Test file paths for different scenarios
   */
  filePaths: {
    valid: [
      '/config/app.json',
      './relative/config.yaml',
      '../parent/config.toml',
      'C:\\Windows\\config.ini',
      '/tmp/test-config.xml',
      'config.properties'
    ],
    invalid: [
      '',
      null,
      undefined,
      '/invalid\x00path.json',
      'con:', // Windows reserved
      'prn.json', // Windows reserved
      '/path/with/\x01control.json',
      'file\nwith\nnewlines.json'
    ],
    edge_cases: [
      'very-long-filename-that-might-cause-issues-with-some-filesystems-but-should-still-be-valid.json',
      '.hidden-config.json',
      'config-with-many-dashes-and-underscores_test_file.json',
      'config.backup.2024-01-01.json',
      'CONFIG_UPPERCASE.JSON'
    ]
  },

  /**
   * Performance test data
   */
  performance: {
    concurrentOperations: 10,
    bulkDataSize: 1000,
    stressTestIterations: 100,
    timeoutLimits: {
      fast: 100,     // 100ms
      normal: 1000,  // 1s
      slow: 5000,    // 5s
      timeout: 30000 // 30s
    }
  },

  /**
   * Error scenarios for testing error handling
   */
  errorScenarios: {
    fileSystem: {
      permissions: '/root/no-permission.json',
      nonExistentDirectory: '/does/not/exist/config.json',
      readonly: '/readonly/config.json'
    },
    data: {
      invalidJson: '{ invalid json }',
      oversized: 'x'.repeat(100 * 1024 * 1024), // 100MB string
      binary: Buffer.from([0x00, 0x01, 0x02, 0x03]).toString(),
      malformed: '{"incomplete": '
    },
    network: {
      timeout: 'network-timeout-simulation',
      connectionReset: 'connection-reset-simulation',
      unavailable: 'service-unavailable-simulation'
    }
  },

  /**
   * Security test data
   */
  security: {
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config',
      '/etc/shadow',
      'C:\\Windows\\System32\\SAM'
    ],
    injection: {
      sql: "'; DROP TABLE configs; --",
      xss: '<script>alert("xss")</script>',
      command: '$(rm -rf /)',
      ldap: '*)(uid=*'
    },
    oversized: {
      key: 'x'.repeat(10000),
      value: 'y'.repeat(100000),
      nested: (() => {
        let obj: any = {};
        let current = obj;
        for (let i = 0; i < 1000; i++) {
          current.level = {};
          current = current.level;
        }
        return obj;
      })()
    }
  },

  /**
   * Helper functions for generating test data
   */
  generators: {
    /**
     * Generates a random configuration object
     */
    randomConfig: (size: 'small' | 'medium' | 'large' = 'medium') => {
      const sizes = {
        small: { sections: 5, props: 10 },
        medium: { sections: 20, props: 25 },
        large: { sections: 100, props: 50 }
      };
      
      const { sections, props } = sizes[size];
      const config: any = {
        metadata: {
          generated: true,
          timestamp: Date.now(),
          size
        }
      };

      for (let i = 0; i < sections; i++) {
        config[`section_${i}`] = {};
        for (let j = 0; j < props; j++) {
          config[`section_${i}`][`prop_${j}`] = Math.random() > 0.5 
            ? `value_${i}_${j}` 
            : Math.floor(Math.random() * 1000);
        }
      }

      return config;
    },

    /**
     * Generates test file content in various formats
     */
    fileContent: (format: string, data: any = testData.sampleConfigurations.basic) => {
      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(data, null, 2);
        case 'yaml':
          // Simplified YAML generation for testing
          return Object.entries(data)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join('\n');
        case 'toml':
          // Simplified TOML generation for testing
          return Object.entries(data)
            .filter(([_, value]) => typeof value !== 'object')
            .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
            .join('\n');
        default:
          return JSON.stringify(data, null, 2);
      }
    },

    /**
     * Generates unique test identifiers
     */
    uniqueId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    /**
     * Generates test file paths with various patterns
     */
    testFilePath: (extension: string = 'json') => {
      const id = testData.generators.uniqueId();
      return `/tmp/test_${id}.${extension}`;
    }
  }
};

export default testData;