import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  OpenRouterService,
  OpenRouterConfigurationError,
  OpenRouterNetworkError,
  OpenRouterAPIError,
  OpenRouterParseError,
} from "@/lib/services/openRouterService";
import { aiPlanSchema } from "@/lib/schemas/ai-response";
import { z } from "zod";
import planGenerationSuccess from "@/test/fixtures/ai-responses/plan-generation-success.json";
import malformedJson from "@/test/fixtures/ai-responses/malformed-json.json";
import invalidSchema from "@/test/fixtures/ai-responses/invalid-schema.json";

describe("OpenRouterService - Constructor & Configuration", () => {
  it("should throw ConfigurationError if API key is undefined", () => {
    expect(
      () =>
        new OpenRouterService({
          apiKey: undefined,
          siteUrl: "http://test.com",
          siteName: "Test",
        })
    ).toThrow(OpenRouterConfigurationError);
  });

  it("should throw ConfigurationError with specific message when API key is missing", () => {
    expect(
      () =>
        new OpenRouterService({
          apiKey: undefined,
          siteUrl: "http://test.com",
          siteName: "Test",
        })
    ).toThrow("OPENROUTER_API_KEY is not set");
  });

  it("should throw ConfigurationError if API key is empty string", () => {
    expect(
      () =>
        new OpenRouterService({
          apiKey: "",
          siteUrl: "http://test.com",
          siteName: "Test",
        })
    ).toThrow(OpenRouterConfigurationError);
  });

  it("should throw ConfigurationError with specific message for empty API key", () => {
    expect(
      () =>
        new OpenRouterService({
          apiKey: "",
          siteUrl: "http://test.com",
          siteName: "Test",
        })
    ).toThrow("OPENROUTER_API_KEY must be a non-empty string");
  });

  it("should throw ConfigurationError if API key is only whitespace", () => {
    expect(
      () =>
        new OpenRouterService({
          apiKey: "   ",
          siteUrl: "http://test.com",
          siteName: "Test",
        })
    ).toThrow(OpenRouterConfigurationError);
  });

  it("should create instance with valid configuration", () => {
    const service = new OpenRouterService({
      apiKey: "test-api-key",
      siteUrl: "http://test.com",
      siteName: "Test",
    });
    expect(service).toBeInstanceOf(OpenRouterService);
  });

  it("should create instance with realistic API key", () => {
    const service = new OpenRouterService({
      apiKey: "sk-or-v1-1234567890abcdef",
      siteUrl: "http://localhost:3000",
      siteName: "GymPlanner",
    });
    expect(service).toBeInstanceOf(OpenRouterService);
  });
});

describe("generateStructuredCompletion - Success Path", () => {
  let service: OpenRouterService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: "test-api-key",
      siteUrl: "http://test.com",
      siteName: "Test",
    });

    // Mock global fetch
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return valid data with primary model", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    const result = await service.generateStructuredCompletion(
      [{ role: "user", content: "Generate a workout plan" }],
      aiPlanSchema
    );

    expect(result.data).toBeDefined();
    expect(result.data.name).toBe("4-tygodniowy PPL na masę");
    expect(result.fallbackUsed).toBe(false);
    expect(result.model).toBe("google/gemini-2.0-flash-exp:free");
  });

  it("should make correct API request with proper headers", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    await service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "HTTP-Referer": "http://test.com",
          "X-Title": "Test",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("should use correct temperature and max_tokens defaults", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    await service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema);

    const callArgs = fetchSpy.mock.calls[0][1];
    const body = JSON.parse(callArgs?.body as string);

    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(4000);
  });

  it("should accept custom temperature and max_tokens", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    await service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema, {
      temperature: 0.5,
      maxTokens: 2000,
    });

    const callArgs = fetchSpy.mock.calls[0][1];
    const body = JSON.parse(callArgs?.body as string);

    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(2000);
  });

  it("should include response_format with json_schema", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    await service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema);

    const callArgs = fetchSpy.mock.calls[0][1];
    const body = JSON.parse(callArgs?.body as string);

    expect(body.response_format).toBeDefined();
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema).toBeDefined();
    expect(body.response_format.json_schema.strict).toBe(true);
  });

  it("should handle system messages", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    await service.generateStructuredCompletion(
      [
        { role: "system", content: "You are a fitness trainer" },
        { role: "user", content: "Generate plan" },
      ],
      aiPlanSchema
    );

    const callArgs = fetchSpy.mock.calls[0][1];
    const body = JSON.parse(callArgs?.body as string);

    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
  });
});

describe("generateStructuredCompletion - Fallback Mechanism", () => {
  let service: OpenRouterService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: "test-api-key",
      siteUrl: "http://test.com",
      siteName: "Test",
    });

    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should use fallback model when primary fails", async () => {
    // First call (primary model) fails
    fetchSpy.mockRejectedValueOnce(new Error("Primary model failed"));

    // Second call (fallback model) succeeds
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...planGenerationSuccess,
        model: "openai/gpt-4o-mini",
      }),
    } as Response);

    const result = await service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema);

    expect(result.fallbackUsed).toBe(true);
    expect(result.model).toBe("openai/gpt-4o-mini");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should try primary model first, then fallback", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Primary failed"));
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    await service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema);

    const firstCall = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    const secondCall = JSON.parse(fetchSpy.mock.calls[1][1]?.body as string);

    expect(firstCall.model).toBe("google/gemini-2.0-flash-exp:free");
    expect(secondCall.model).toBe("openai/gpt-4o-mini");
  });

  it("should use fallback on API error", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Server error",
    } as Response);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    const result = await service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema);

    expect(result.fallbackUsed).toBe(true);
  });

  it("should use fallback on parse error", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => malformedJson,
    } as Response);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    const result = await service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema);

    expect(result.fallbackUsed).toBe(true);
  });
});

describe("generateStructuredCompletion - Error Handling", () => {
  let service: OpenRouterService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: "test-api-key",
      siteUrl: "http://test.com",
      siteName: "Test",
    });

    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should throw NetworkError when both models fail with network error", async () => {
    fetchSpy.mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema)
    ).rejects.toThrow(OpenRouterNetworkError);
  });

  it("should throw APIError on 4xx response when both models fail", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "Invalid API key",
    } as Response);

    await expect(
      service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema)
    ).rejects.toThrow(OpenRouterAPIError);
  });

  it("should include status code in APIError", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: async () => "Rate limit exceeded",
    } as Response);

    try {
      await service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema);
      expect.fail("Should have thrown error");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenRouterAPIError);
      expect((error as OpenRouterAPIError).statusCode).toBe(429);
      expect((error as OpenRouterAPIError).responseBody).toBe("Rate limit exceeded");
    }
  });

  it("should throw APIError on 5xx response", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => "Service temporarily unavailable",
    } as Response);

    await expect(
      service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema)
    ).rejects.toThrow(OpenRouterAPIError);
  });

  it("should throw ParseError when both models return malformed JSON", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => malformedJson,
    } as Response);

    await expect(
      service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema)
    ).rejects.toThrow(OpenRouterParseError);
  });

  it("should throw ParseError when JSON is valid but schema mismatches", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => invalidSchema,
    } as Response);

    await expect(
      service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema)
    ).rejects.toThrow(OpenRouterParseError);
  });

  it("should throw ParseError when content is empty", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "" } }],
      }),
    } as Response);

    await expect(
      service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema)
    ).rejects.toThrow(OpenRouterParseError);
  });

  it("should throw ParseError when content is null", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: null } }],
      }),
    } as Response);

    await expect(
      service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema)
    ).rejects.toThrow("Model returned empty content");
  });

  it("should throw ParseError when messages array is empty", async () => {
    await expect(service.generateStructuredCompletion([], aiPlanSchema)).rejects.toThrow(OpenRouterParseError);
  });

  it("should include raw content in ParseError for debugging", async () => {
    const invalidContent = '{"invalid": "data"}';
    // Mock both attempts to fail
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: invalidContent } }],
      }),
    } as Response);

    try {
      await service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema);
      expect.fail("Should have thrown error");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenRouterParseError);
      expect((error as OpenRouterParseError).rawContent).toBe(invalidContent);
    }
  });
});

describe("generateStructuredCompletion - Input Validation", () => {
  let service: OpenRouterService;

  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: "test-api-key",
      siteUrl: "http://test.com",
      siteName: "Test",
    });
  });

  it("should reject empty messages array", async () => {
    await expect(service.generateStructuredCompletion([], aiPlanSchema)).rejects.toThrow(
      "Messages array cannot be empty"
    );
  });

  it("should accept single message", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    await expect(
      service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema)
    ).resolves.toBeDefined();
  });

  it("should accept multiple messages", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    await expect(
      service.generateStructuredCompletion(
        [
          { role: "system", content: "You are a trainer" },
          { role: "user", content: "Generate plan" },
          { role: "assistant", content: "Sure!" },
          { role: "user", content: "Make it 4 weeks" },
        ],
        aiPlanSchema
      )
    ).resolves.toBeDefined();
  });
});

describe("generateStructuredCompletion - Schema Validation", () => {
  let service: OpenRouterService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: "test-api-key",
      siteUrl: "http://test.com",
      siteName: "Test",
    });

    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should validate response against provided schema", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => planGenerationSuccess,
    } as Response);

    const result = await service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema);

    // Verify the result matches the schema structure
    expect(result.data).toHaveProperty("name");
    expect(result.data).toHaveProperty("description");
    expect(result.data).toHaveProperty("schedule");
    expect(result.data).toHaveProperty("cycle_duration_weeks");
  });

  it("should work with simple schema", async () => {
    const simpleSchema = z.object({
      message: z.string(),
      count: z.number(),
    });

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"message":"Hello","count":42}',
            },
          },
        ],
      }),
    } as Response);

    const result = await service.generateStructuredCompletion([{ role: "user", content: "test" }], simpleSchema);

    expect(result.data.message).toBe("Hello");
    expect(result.data.count).toBe(42);
  });

  it("should reject response that doesn't match schema", async () => {
    // Mock both attempts to fail with same invalid response
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"wrong":"field"}',
            },
          },
        ],
      }),
    } as Response);

    await expect(
      service.generateStructuredCompletion([{ role: "user", content: "test" }], aiPlanSchema)
    ).rejects.toThrow(OpenRouterParseError);
  });
});
