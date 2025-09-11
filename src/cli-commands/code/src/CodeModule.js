/**
 * Code Command Module for RCC4 System
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

class CodeModule {
  constructor() {
    this.metadata = {
      name: 'code',
      version: '1.0.0',
      description: 'RCC4 code interaction and API commands'
    };
  }

  async getCommands() {
    return [
      {
        name: 'code',
        description: 'Send code request to RCC4 system',
        usage: 'code [message] [options]',
        options: [
          {
            name: 'port',
            description: 'Port number of the running server',
            type: 'number',
            default: 5506
          },
          {
            name: 'model',
            description: 'Model to use for the request',
            type: 'string',
            default: 'claude-3-sonnet-20240229'
          },
          {
            name: 'max-tokens',
            description: 'Maximum tokens in response',
            type: 'number',
            default: 4000
          },
          {
            name: 'temperature',
            description: 'Temperature for response generation',
            type: 'number',
            default: 0.7
          },
          {
            name: 'file',
            alias: 'f',
            description: 'Read message from file',
            type: 'string'
          }
        ],
        flags: [
          {
            name: 'stream',
            alias: 's',
            description: 'Stream the response'
          },
          {
            name: 'raw',
            alias: 'r',
            description: 'Output raw JSON response'
          }
        ],
        execute: async (context) => {
          const { args, options, flags, logger } = context;
          
          try {
            // Get message from args or file
            let message = '';
            if (options.file) {
              if (!fs.existsSync(options.file)) {
                throw new Error(`File not found: ${options.file}`);
              }
              message = fs.readFileSync(options.file, 'utf8');
            } else if (args.length > 0) {
              message = args.join(' ');
            } else {
              throw new Error('No message provided. Use argument or --file option.');
            }

            logger.info('Sending code request to RCC4 system...');
            
            const response = await this.sendCodeRequest(
              message,
              options.port,
              {
                model: options.model,
                max_tokens: options['max-tokens'],
                temperature: options.temperature,
                stream: flags.stream
              }
            );

            if (flags.raw) {
              console.log(JSON.stringify(response, null, 2));
            } else {
              this.displayResponse(response, flags.stream);
            }

          } catch (error) {
            logger.error(`Code request failed: ${error.message}`);
            if (context.framework.options.devMode) {
              console.error(error.stack);
            }
            process.exit(1);
          }
        }
      },
      {
        name: 'chat',
        description: 'Start an interactive chat session with RCC4',
        usage: 'chat [options]',
        options: [
          {
            name: 'port',
            description: 'Port number of the running server',
            type: 'number',
            default: 5506
          },
          {
            name: 'model',
            description: 'Model to use for the chat',
            type: 'string',
            default: 'claude-3-sonnet-20240229'
          }
        ],
        execute: async (context) => {
          const { options, logger } = context;
          
          logger.info('Starting interactive chat session...');
          logger.info('Type "exit" or press Ctrl+C to quit');
          
          try {
            await this.startInteractiveChat(options.port, options.model);
          } catch (error) {
            logger.error(`Chat session failed: ${error.message}`);
            process.exit(1);
          }
        }
      }
    ];
  }

  async sendCodeRequest(message, port, options = {}) {
    const payload = {
      model: options.model || 'claude-3-sonnet-20240229',
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: options.max_tokens || 4000,
      temperature: options.temperature || 0.7,
      stream: options.stream || false
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);
      
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 60000
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
          
          // Handle streaming responses
          if (options.stream) {
            const lines = chunk.toString().split('\n');
            lines.forEach(line => {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const jsonData = JSON.parse(line.substring(6));
                  if (jsonData.choices && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                    process.stdout.write(jsonData.choices[0].delta.content);
                  }
                } catch (e) {
                  // Ignore parsing errors for streaming data
                }
              }
            });
          }
        });

        res.on('end', () => {
          if (options.stream) {
            console.log('\n');
            resolve({ streaming_complete: true });
          } else {
            try {
              const response = JSON.parse(data);
              resolve(response);
            } catch (e) {
              reject(new Error(`Invalid JSON response: ${data}`));
            }
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      req.write(postData);
      req.end();
    });
  }

  displayResponse(response, isStreaming) {
    if (isStreaming) {
      return; // Already displayed during streaming
    }

    console.log('\n📝 Response:');
    console.log('─'.repeat(50));
    
    if (response.choices && response.choices.length > 0) {
      const content = response.choices[0].message?.content || 'No content';
      console.log(content);
    } else if (response.error) {
      console.log(`❌ Error: ${response.error.message || 'Unknown error'}`);
    } else {
      console.log('No response content available');
    }

    if (response.usage) {
      console.log('\n📊 Usage:');
      console.log(`   Input tokens: ${response.usage.prompt_tokens || 'N/A'}`);
      console.log(`   Output tokens: ${response.usage.completion_tokens || 'N/A'}`);
      console.log(`   Total tokens: ${response.usage.total_tokens || 'N/A'}`);
    }
    
    console.log('');
  }

  async startInteractiveChat(port, model) {
    const readline = require('readline');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '💬 You: '
    });

    const conversation = [];

    console.log(`\n🤖 RCC4 Interactive Chat (${model})`);
    console.log('═'.repeat(50));
    
    rl.prompt();

    rl.on('line', async (input) => {
      const message = input.trim();
      
      if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
        rl.close();
        return;
      }

      if (!message) {
        rl.prompt();
        return;
      }

      try {
        console.log('\n🤖 Assistant: ');
        
        // Add user message to conversation
        conversation.push({ role: 'user', content: message });

        // Send request with conversation history
        const response = await this.sendCodeRequest('', port, {
          model: model,
          messages: conversation,
          stream: true
        });

        // Note: For streaming, the response is already displayed
        // Add assistant response to conversation (we'd need to capture it for full conversation)
        // For simplicity, we'll just continue the conversation
        
        console.log('\n');
        rl.prompt();

      } catch (error) {
        console.log(`\n❌ Error: ${error.message}\n`);
        rl.prompt();
      }
    });

    rl.on('close', () => {
      console.log('\n👋 Chat session ended. Goodbye!');
      process.exit(0);
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n👋 Chat session ended. Goodbye!');
      process.exit(0);
    });
  }

  async initialize() {
    // Module initialization if needed
  }

  async cleanup() {
    // Module cleanup if needed
  }
}

module.exports = CodeModule;