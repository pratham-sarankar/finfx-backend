/**
 * Delta Exchange REST API Client
 * Provides a client interface for interacting with Delta Exchange trading platform
 * Handles authentication, signature generation, and API requests
 */
import axios from "axios";
import * as crypto from "crypto";

/**
 * Delta Exchange REST API Client Class
 * Manages authenticated requests to Delta Exchange API endpoints
 */
export class DeltaRestClient {
  /** Axios client instance configured for Delta Exchange API */
  private client: ReturnType<typeof axios.create>;
  /** API secret key for signature generation */
  private apiSecret: string;

  /**
   * Initialize Delta REST client with authentication credentials
   * @param {string} baseUrl - Base URL for Delta Exchange API
   * @param {string} apiKey - API key for authentication
   * @param {string} apiSecret - API secret for signature generation
   * @param {number} [timestamp] - Optional timestamp for request headers
   */
  constructor(
    baseUrl: string,
    apiKey: string,
    apiSecret: string,
    timestamp?: number
  ) {
    this.apiSecret = apiSecret;

    // Create axios client with default configuration
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
        timestamp: timestamp?.toString() || Date.now().toString(),
      },
    });
  }

  /**
   * Generate HMAC SHA256 signature for API authentication
   * @param {string} path - API endpoint path
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} [body=""] - Request body (empty for GET requests)
   * @returns {string} Generated signature in hexadecimal format
   * @private
   */
  private generateSignature(
    path: string,
    method: string,
    body: string = ""
  ): string {
    const message = method + path + body;
    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(message)
      .digest("hex");
  }

  /**
   * Get wallet balances from Delta Exchange
   * @param {number} [assetId] - Optional specific asset ID to filter balances
   * @returns {Promise<any>} Promise resolving to balance data
   * @throws {Error} API request errors
   */
  async getBalances(assetId?: number) {
    const path = "/v2/wallet/balances";
    const method = "GET";
    const signature = this.generateSignature(path, method);

    const response = await this.client.get(path, {
      headers: {
        signature: signature,
      },
      params: assetId ? { asset_id: assetId } : {},
    });

    return response.data;
  }

  /**
   * Get account information from Delta Exchange
   * @returns {Promise<any>} Promise resolving to account information
   * @throws {Error} API request errors with descriptive message
   */
  async getAccountInfo() {
    try {
      const path = "/v2/account";
      const method = "GET";
      const signature = this.generateSignature(path, method);

      const response = await this.client.get(path, {
        headers: {
          signature: signature,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account info: ${error}`);
    }
  }
}
