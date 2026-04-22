import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { retryWithBackoff } from '../../common/utils/retry.util';
import { RateLimiter } from '../../common/utils/rate-limiter.util';
import { AiCache } from '../../common/utils/ai-cache.util';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    // Default fallback instances (from env)
    private defaultGenAI: GoogleGenerativeAI;
    private defaultOpenAI: OpenAI;

    // Rate limiter: 15 requests per minute for Gemini free tier
    private readonly rateLimiter = new RateLimiter({
        tokensPerInterval: 15,
        intervalMs: 60_000,
    });

    // Response cache: avoid duplicate API calls for identical scan data
    private readonly cache = new AiCache<any>({
        maxEntries: 100,
        ttlMs: 30 * 60 * 1000, // 30 minute TTL
    });

    constructor() {
        // Initialize default Gemini
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            this.defaultGenAI = new GoogleGenerativeAI(geminiKey);
        }

        // Initialize default OpenAI
        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) {
            this.defaultOpenAI = new OpenAI({ apiKey: openaiKey });
        }
    }

    async analyzePrivacy(data: any, config?: { provider: string, apiKey?: string }): Promise<any> {
        const provider = config?.provider || 'gemini';
        let customApiKey = config?.apiKey;

        this.logger.log(`Analyzing with provider: ${provider} ${customApiKey ? '(using custom key)' : '(using default key)'}`);

        const prompt = `
      You are a Privacy Compliance Expert. Analyze the following website scan data.
      
      URL: ${data.url}
      Cookies Found: ${JSON.stringify(data.cookies || [])}
      External Scripts: ${JSON.stringify(data.scripts || [])}
      Privacy Policy Snippet: "${data.privacyPolicyText ? data.privacyPolicyText.substring(0, 2000) : 'None found'}"
      Metadata: ${JSON.stringify(data.metadata || {})}

      Task:
      1. Calculate a privacy risk score (0-100, where 100 is perfectly safe).
      2. Identify specific risks (GDPR, CCPA gaps, tracking).
      3. Recommend improvements.
      
      Return ONLY valid JSON in this format:
      {
        "score": number,
        "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "analysis": "summary string",
        "risks": [{ "category": "string", "description": "string", "severity": "string" }],
        "recommendations": ["string"]
      }
    `;

        // --- Check cache first to avoid redundant API calls ---
        const cacheKey = this.cache.createKey(prompt);
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            this.logger.log('Returning cached AI analysis result');
            return { ...cachedResult, _cached: true };
        }

        // --- Rate limiting: check before calling the API ---
        if (!this.rateLimiter.acquire()) {
            const waitTime = this.rateLimiter.getWaitTimeMs();
            this.logger.warn(`Rate limit exceeded. Next token available in ~${Math.ceil(waitTime / 1000)}s`);
            return {
                score: 0,
                riskLevel: 'UNAVAILABLE',
                analysis: 'AI analysis is temporarily rate-limited to protect API quota. The scan data (cookies, scripts, trackers, headers) is still available below. Please try again in a minute.',
                risks: [],
                recommendations: ['Wait 1-2 minutes before scanning again to allow quota recovery.'],
                _rateLimited: true,
            };
        }

        try {
            let result: any;

            if (provider === 'openai') {
                result = await this.analyzeWithOpenAI(prompt, customApiKey);
            } else {
                result = await this.analyzeWithGemini(prompt, customApiKey);
            }

            // Cache successful result for future identical requests
            this.cache.set(cacheKey, result);

            return result;
        } catch (error) {
            this.logger.error(`AI Analysis failed: ${error.message}`);

            // Detect 429 quota errors specifically for a more helpful message
            const is429 = this.isQuotaError(error);

            return {
                score: 0,
                riskLevel: is429 ? 'UNAVAILABLE' : 'ERROR',
                analysis: is429
                    ? 'AI quota exceeded for the current API key. Scan data (cookies, trackers, headers) is still displayed below. Try again later or configure a different API key in Settings.'
                    : `Failed to analyze data with ${provider}. Error: ${error.message}`,
                risks: [],
                recommendations: is429
                    ? [
                        'Wait a few minutes for quota to reset.',
                        'Use a different API key in Settings.',
                        'Review the raw scan data below manually.',
                    ]
                    : [],
                error: error.message,
                _quotaExceeded: is429,
            };
        }
    }

    /**
     * Calls Gemini API with exponential backoff retry on transient errors.
     */
    private async analyzeWithGemini(prompt: string, apiKey?: string): Promise<any> {
        let genAI = this.defaultGenAI;

        // Use custom instance if key provided
        if (apiKey) {
            genAI = new GoogleGenerativeAI(apiKey);
        }

        if (!genAI) {
            throw new Error('Gemini API Key not configured.');
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Wrap the API call with retry logic for 429/5xx errors
        const result = await retryWithBackoff(
            () => model.generateContent(prompt),
            {
                maxRetries: 3,
                baseDelayMs: 2000, // Start with 2s for Gemini rate limits
                maxDelayMs: 30000,
                onRetry: (attempt, delay, error) => {
                    this.logger.warn(
                        `Gemini API retry #${attempt} in ${delay}ms — reason: ${error.message}`
                    );
                },
            },
        );

        const response = await result.response;
        const text = response.text();
        return this.parseJson(text);
    }

    /**
     * Calls OpenAI API with exponential backoff retry on transient errors.
     */
    private async analyzeWithOpenAI(prompt: string, apiKey?: string): Promise<any> {
        let openai = this.defaultOpenAI;

        // Use custom instance if key provided
        if (apiKey) {
            openai = new OpenAI({ apiKey });
        }

        if (!openai) {
            throw new Error('OpenAI API Key not configured.');
        }

        // Wrap the API call with retry logic for 429/5xx errors
        const completion = await retryWithBackoff(
            () =>
                openai.chat.completions.create({
                    messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: prompt }],
                    model: "gpt-3.5-turbo",
                    response_format: { type: "json_object" }, // Ensure JSON mode if supported or prompt strictness
                }),
            {
                maxRetries: 3,
                baseDelayMs: 1500,
                maxDelayMs: 20000,
                onRetry: (attempt, delay, error) => {
                    this.logger.warn(
                        `OpenAI API retry #${attempt} in ${delay}ms — reason: ${error.message}`
                    );
                },
            },
        );

        const text = completion.choices[0].message.content;
        return this.parseJson(text);
    }

    private parseJson(text: string | null): any {
        if (!text) {
            throw new Error('Empty response from AI provider');
        }
        try {
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            this.logger.error(`Failed to parse AI response: ${text}`);
            throw new Error('Invalid JSON response from AI provider');
        }
    }

    /**
     * Checks if an error is a quota/rate-limit error (HTTP 429).
     */
    private isQuotaError(error: any): boolean {
        const msg = (error?.message || '').toLowerCase();
        return (
            msg.includes('429') ||
            msg.includes('quota') ||
            msg.includes('rate limit') ||
            msg.includes('resource has been exhausted') ||
            error?.status === 429
        );
    }
}
