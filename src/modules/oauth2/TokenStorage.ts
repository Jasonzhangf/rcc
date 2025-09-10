/**
 * Token Storage Implementation
 * Simple file-based token storage without encryption
 */

import * as fs from 'fs';
import * as path from 'path';
import { TokenData } from './OAuth2Types';
import { TOKEN_FILE_PATTERNS } from './OAuth2Constants';

/**
 * Simple token storage implementation
 */
export class TokenStorage {
  private storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    this.ensureStorageDirectory();
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Get token file path for email
   */
  private getTokenFilePath(email: string): string {
    const sanitizedEmail = this.sanitizeEmail(email);
    return path.join(this.storagePath, `${TOKEN_FILE_PATTERNS.prefix}${sanitizedEmail}${TOKEN_FILE_PATTERNS.extension}`);
  }

  /**
   * Sanitize email for use in filename
   */
  private sanitizeEmail(email: string): string {
    return email.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Save token data for email
   */
  async saveToken(email: string, tokenData: TokenData): Promise<void> {
    try {
      const filePath = this.getTokenFilePath(email);
      const storageData = {
        ...tokenData,
        email,
        storedAt: Date.now(),
        version: 1
      };

      await fs.promises.writeFile(filePath, JSON.stringify(storageData, null, 2));
    } catch (error) {
      throw new Error(`Failed to save token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load token data for email
   */
  async loadToken(email: string): Promise<TokenData | null> {
    try {
      const filePath = this.getTokenFilePath(email);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = await fs.promises.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);

      // Extract token data, ignoring storage metadata
      const { email: _, storedAt: __, version: ___, ...tokenData } = parsed;

      return tokenData as TokenData;
    } catch (error) {
      // If file is corrupted or unreadable, treat as not found
      return null;
    }
  }

  /**
   * Delete token for email
   */
  async deleteToken(email: string): Promise<void> {
    try {
      const filePath = this.getTokenFilePath(email);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to delete token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all stored token emails
   */
  listStoredEmails(): string[] {
    try {
      const files = fs.readdirSync(this.storagePath);
      return files
        .filter(file => file.startsWith(TOKEN_FILE_PATTERNS.prefix) && file.endsWith(TOKEN_FILE_PATTERNS.extension))
        .map(file => {
          const prefixRemoved = file.substring(TOKEN_FILE_PATTERNS.prefix.length);
          return prefixRemoved.substring(0, prefixRemoved.length - TOKEN_FILE_PATTERNS.extension.length);
        });
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if token exists for email
   */
  hasToken(email: string): boolean {
    const filePath = this.getTokenFilePath(email);
    return fs.existsSync(filePath);
  }

  /**
   * Get token file path (for debugging purposes)
   */
  getTokenPath(email: string): string {
    return this.getTokenFilePath(email);
  }

  /**
   * Clear all stored tokens
   */
  async clearAllTokens(): Promise<void> {
    try {
      const files = fs.readdirSync(this.storagePath);
      const tokenFiles = files.filter(file => 
        file.startsWith(TOKEN_FILE_PATTERNS.prefix) && 
        file.endsWith(TOKEN_FILE_PATTERNS.extension)
      );

      for (const file of tokenFiles) {
        const filePath = path.join(this.storagePath, file);
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to clear tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalTokens: number;
    storagePath: string;
    totalSize: number;
  } {
    try {
      const files = fs.readdirSync(this.storagePath);
      const tokenFiles = files.filter(file => 
        file.startsWith(TOKEN_FILE_PATTERNS.prefix) && 
        file.endsWith(TOKEN_FILE_PATTERNS.extension)
      );

      let totalSize = 0;
      for (const file of tokenFiles) {
        const filePath = path.join(this.storagePath, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }

      return {
        totalTokens: tokenFiles.length,
        storagePath: this.storagePath,
        totalSize
      };
    } catch (error) {
      return {
        totalTokens: 0,
        storagePath: this.storagePath,
        totalSize: 0
      };
    }
  }
}