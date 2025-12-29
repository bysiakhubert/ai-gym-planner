import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { OPENROUTER_API_KEY, SITE_URL } from "astro:env/server";

/**
 * Base error class for all OpenRouter-related errors
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/**
 * Error thrown when OpenRouter configuration is invalid
 * Example: Missing API key or invalid environment variables
 */
export class OpenRouterConfigurationError extends OpenRouterError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR");
    this.name = "OpenRouterConfigurationError";
  }
}

/**
 * Error thrown when network request fails
 * Example: Timeout, connection refused, DNS errors
 */
export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR");
    this.name = "OpenRouterNetworkError";
  }
}

/**
 * Error thrown when OpenRouter API returns an error response
 * Example: 4xx client errors, 5xx server errors
 */
export class OpenRouterAPIError extends OpenRouterError {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string
  ) {
    super(message, "API_ERROR");
    this.name = "OpenRouterAPIError";
  }
}

/**
 * Error thrown when response parsing or validation fails
 * Example: Invalid JSON, schema mismatch
 */
export class OpenRouterParseError extends OpenRouterError {
  constructor(
    message: string,
    public rawContent?: string
  ) {
    super(message, "PARSE_ERROR");
    this.name = "OpenRouterParseError";
  }
}

/**
 * Configuration options for OpenRouterService
 */
interface OpenRouterConfig {
  apiKey: string | undefined;
  siteUrl: string;
  siteName: string;
}

/**
 * Options for completion requests
 */
interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Message structure for chat completions
 */
interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Response from OpenRouter API (simplified)
 */
interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
}

/**
 * Service for interacting with OpenRouter API
 * Handles authentication, structured output generation, and error handling
 *
 * This service is designed to work exclusively server-side (SSR/API Routes)
 * and should never be exposed to the client bundle.
 */
export class OpenRouterService {
  private apiKey: string;
  private siteUrl: string;
  private siteName: string;
  private readonly baseUrl = "https://openrouter.ai/api/v1";
  private readonly defaultModel = "google/gemini-2.0-flash-exp:free";

  /**
   * Creates a new OpenRouterService instance
   * @throws {OpenRouterConfigurationError} If API key is missing or invalid
   */
  constructor(config: OpenRouterConfig) {
    // Guard clause: Fail fast if API key is missing
    if (!config.apiKey) {
      throw new OpenRouterConfigurationError(
        "OPENROUTER_API_KEY is not set. Please configure it in your environment variables."
      );
    }

    // Validate API key format (basic check)
    if (typeof config.apiKey !== "string" || config.apiKey.trim().length === 0) {
      throw new OpenRouterConfigurationError("OPENROUTER_API_KEY must be a non-empty string.");
    }

    this.apiKey = config.apiKey;
    this.siteUrl = config.siteUrl;
    this.siteName = config.siteName;
  }

  /**
   * Generates a structured completion using OpenRouter API
   * Returns parsed and validated data conforming to the provided Zod schema
   *
   * @template T - The expected response type (inferred from schema)
   * @param messages - Array of chat messages (system, user, assistant)
   * @param schema - Zod schema defining the expected response structure
   * @param options - Optional configuration (model, temperature, max tokens)
   * @returns Promise resolving to validated data of type T
   * @throws {OpenRouterNetworkError} If network request fails
   * @throws {OpenRouterAPIError} If API returns an error response
   * @throws {OpenRouterParseError} If response parsing or validation fails
   */
  async generateStructuredCompletion<T>(
    messages: Message[],
    schema: z.ZodType<T>,
    options: CompletionOptions = {}
  ): Promise<T> {
    // Guard clause: Validate input messages
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new OpenRouterParseError("Messages array cannot be empty");
    }

    // Convert Zod schema to JSON Schema format for OpenRouter
    const jsonSchema = this.transformSchemaToJsonSchema(schema);

    // Build request payload
    const payload = {
      model: options.model || this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.2, // Low temperature for better structure
      max_tokens: options.maxTokens ?? 4000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "response",
          strict: true, // Enforce exact schema matching
          schema: jsonSchema,
        },
      },
    };

    try {
      // Make API request
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": this.siteUrl,
          "X-Title": this.siteName,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorBody = await response.text();
        throw new OpenRouterAPIError(
          `OpenRouter API error: ${response.status} ${response.statusText}`,
          response.status,
          errorBody
        );
      }

      // Parse JSON response
      let data: OpenRouterResponse;
      try {
        data = await response.json();
      } catch {
        throw new OpenRouterParseError("Failed to parse JSON response from OpenRouter API");
      }

      // Extract model output
      const rawContent = data.choices[0]?.message?.content;

      // Guard clause: Check if content exists
      if (!rawContent) {
        throw new OpenRouterParseError("Model returned empty content");
      }

      // Parse and validate structured output
      return this.parseAndValidateOutput(rawContent, schema);
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof OpenRouterConfigurationError ||
        error instanceof OpenRouterNetworkError ||
        error instanceof OpenRouterAPIError ||
        error instanceof OpenRouterParseError
      ) {
        throw error;
      }

      // Handle unknown network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new OpenRouterNetworkError(`Network error: ${error.message}`);
      }

      // Handle any other unexpected errors
      throw new OpenRouterNetworkError(`Unexpected error: ${(error as Error).message}`);
    }
  }

  /**
   * Converts Zod schema to JSON Schema format accepted by OpenRouter
   * @private
   */
  private transformSchemaToJsonSchema(schema: z.ZodType): object {
    try {
      const jsonSchema = zodToJsonSchema(schema, "response");

      // Remove $schema property if present (OpenRouter doesn't need it)
      const cleanSchema = { ...jsonSchema };
      delete (cleanSchema as Record<string, unknown>).$schema;

      return cleanSchema;
    } catch (error) {
      throw new OpenRouterConfigurationError(
        `Failed to convert Zod schema to JSON Schema: ${(error as Error).message}`
      );
    }
  }

  /**
   * Parses raw JSON string and validates against Zod schema
   * @private
   */
  private parseAndValidateOutput<T>(rawContent: string, schema: z.ZodType<T>): T {
    // Parse JSON
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      // eslint-disable-next-line no-console
      console.error("Failed to parse model output as JSON:", rawContent);
      throw new OpenRouterParseError("Model output is not valid JSON", rawContent);
    }

    // Validate against Zod schema
    try {
      return schema.parse(parsedJson);
    } catch (zodError) {
      // eslint-disable-next-line no-console
      console.error("Model output does not match expected schema:", {
        output: parsedJson,
        error: zodError,
      });
      throw new OpenRouterParseError(
        `Model output does not match expected schema: ${(zodError as Error).message}`,
        rawContent
      );
    }
  }
}

/**
 * Lazy singleton instance of OpenRouterService
 * Created on first access to ensure environment variables are loaded
 */
let _openRouterService: OpenRouterService | null = null;

/**
 * Gets the OpenRouterService instance (creates it lazily on first call)
 * Uses astro:env/server for proper environment variable handling
 *
 * @returns OpenRouterService instance
 * @throws {OpenRouterConfigurationError} If API key is missing
 */
export function getOpenRouterService(): OpenRouterService {
  if (!_openRouterService) {
    _openRouterService = new OpenRouterService({
      apiKey: OPENROUTER_API_KEY,
      siteUrl: SITE_URL || "http://localhost:3000",
      siteName: "GymPlanner",
    });
  }
  return _openRouterService;
}

/**
 * Singleton instance of OpenRouterService
 * Uses lazy initialization through getOpenRouterService() for proper env var handling
 */
export const openRouterService = {
  generateStructuredCompletion: <T>(
    ...args: Parameters<OpenRouterService["generateStructuredCompletion"]>
  ): Promise<T> => {
    return getOpenRouterService().generateStructuredCompletion<T>(...args);
  },
};
