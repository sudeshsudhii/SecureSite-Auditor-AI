import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { retryWithBackoff } from '../../common/utils/retry.util';
import { RateLimiter } from '../../common/utils/rate-limiter.util';
import { AiCache } from '../../common/utils/ai-cache.util';

// ---------------------------------------------------------------------------
// Circuit-breaker state per provider
// ---------------------------------------------------------------------------
interface ProviderCircuit {
    failed: boolean;
    failedAt: number;
    cooldownMs: number; // how long to stay "open"
}

const PROVIDER_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    // Default provider instances (from env)
    private defaultGenAI: GoogleGenerativeAI | null = null;
    private defaultOpenAI: OpenAI | null = null;
    private defaultAnthropic: Anthropic | null = null;

    // Rate limiter: 15 requests per minute (Gemini free-tier ceiling)
    private readonly rateLimiter = new RateLimiter({
        tokensPerInterval: 15,
        intervalMs: 60_000,
    });

    // Response cache — avoid duplicate API calls for identical scan data
    private readonly cache = new AiCache<any>({
        maxEntries: 100,
        ttlMs: 30 * 60 * 1000, // 30 minutes
    });

    // Circuit breakers — one per provider
    private readonly circuits: Record<string, ProviderCircuit> = {
        gemini: { failed: false, failedAt: 0, cooldownMs: PROVIDER_COOLDOWN_MS },
        openai: { failed: false, failedAt: 0, cooldownMs: PROVIDER_COOLDOWN_MS },
        claude: { failed: false, failedAt: 0, cooldownMs: PROVIDER_COOLDOWN_MS },
    };

    constructor() {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) this.defaultGenAI = new GoogleGenerativeAI(geminiKey);

        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) this.defaultOpenAI = new OpenAI({ apiKey: openaiKey });

        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (anthropicKey) this.defaultAnthropic = new Anthropic({ apiKey: anthropicKey });
    }

    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------
    async analyzePrivacy(data: any, config?: { provider: string; apiKey?: string }): Promise<any> {
        const preferredProvider = config?.provider || 'gemini';
        const customApiKey = config?.apiKey;

        const prompt = this.buildPrompt(data);

        // Cache check
        const cacheKey = this.cache.createKey(prompt);
        const cached = this.cache.get(cacheKey);
        if (cached) {
            this.logger.log('Returning cached AI analysis result');
            return { ...cached, _cached: true };
        }

        // Rate limit check
        if (!this.rateLimiter.acquire()) {
            const waitMs = this.rateLimiter.getWaitTimeMs();
            this.logger.warn(`Global rate limit hit. Next slot in ~${Math.ceil(waitMs / 1000)}s`);
            return this.rateLimitedResponse(waitMs);
        }

        // Build provider chain: preferred first, then others, then rule-based
        const chain = this.buildProviderChain(preferredProvider);
        this.logger.log(`AI provider chain: ${chain.join(' → ')} → rule-based`);

        for (const provider of chain) {
            if (!this.isCircuitClosed(provider)) {
                this.logger.warn(`[Circuit OPEN] Skipping ${provider} (cooling down)`);
                continue;
            }

            try {
                let result: any;
                this.logger.log(`Trying provider: ${provider}`);

                if (provider === 'gemini') {
                    result = await this.analyzeWithGemini(prompt, customApiKey);
                } else if (provider === 'openai') {
                    result = await this.analyzeWithOpenAI(prompt, customApiKey);
                } else if (provider === 'claude') {
                    result = await this.analyzeWithClaude(prompt, customApiKey);
                }

                // Reset circuit on success
                this.resetCircuit(provider);

                const response = { ...result, _provider: provider };
                this.cache.set(cacheKey, response);
                return response;

            } catch (err: any) {
                this.logger.error(`[${provider}] Failed: ${err.message}`);

                // Open circuit if it's a quota/server error
                if (this.isQuotaOrServerError(err)) {
                    this.openCircuit(provider);
                    this.logger.warn(`[Circuit OPENED] ${provider} will be skipped for ${PROVIDER_COOLDOWN_MS / 60000} min`);
                }
                // Continue to next provider
            }
        }

        // All providers exhausted → rule-based
        this.logger.warn('All AI providers failed/unavailable — using rule-based analysis');
        return this.ruleBased(data);
    }

    // ---------------------------------------------------------------------------
    // Prompt builder
    // ---------------------------------------------------------------------------
    private buildPrompt(data: any): string {
        return `
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

Return ONLY valid JSON in this exact format:
{
  "score": number,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "analysis": "summary string",
  "risks": [{ "category": "string", "description": "string", "severity": "string" }],
  "recommendations": ["string"]
}`.trim();
    }

    // ---------------------------------------------------------------------------
    // Provider implementations
    // ---------------------------------------------------------------------------
    private async analyzeWithGemini(prompt: string, apiKey?: string): Promise<any> {
        const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : this.defaultGenAI;
        if (!genAI) throw new Error('Gemini API Key not configured.');

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await retryWithBackoff(() => model.generateContent(prompt), {
            maxRetries: 2,
            baseDelayMs: 2000,
            maxDelayMs: 15000,
            onRetry: (attempt, delay, err) =>
                this.logger.warn(`Gemini retry #${attempt} in ${delay}ms — ${err.message}`),
        });
        const text = (await result.response).text();
        return this.parseJson(text);
    }

    private async analyzeWithOpenAI(prompt: string, apiKey?: string): Promise<any> {
        const openai = apiKey ? new OpenAI({ apiKey }) : this.defaultOpenAI;
        if (!openai) throw new Error('OpenAI API Key not configured.');

        const completion = await retryWithBackoff(
            () =>
                openai.chat.completions.create(
                    {
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: 'You are a privacy compliance expert. Always respond with valid JSON only.' },
                            { role: 'user', content: prompt },
                        ],
                        response_format: { type: 'json_object' },
                    },
                    { timeout: 30000 },
                ) as Promise<import('openai').OpenAI.ChatCompletion>,
            {
                maxRetries: 2,
                baseDelayMs: 1500,
                maxDelayMs: 12000,
                onRetry: (attempt, delay, err) =>
                    this.logger.warn(`OpenAI retry #${attempt} in ${delay}ms — ${err.message}`),
            },
        );
        return this.parseJson(completion.choices[0].message.content);
    }

    private async analyzeWithClaude(prompt: string, apiKey?: string): Promise<any> {
        const anthropic = apiKey ? new Anthropic({ apiKey }) : this.defaultAnthropic;
        if (!anthropic) throw new Error('Anthropic API Key not configured.');

        const message = await retryWithBackoff(
            () =>
                anthropic.messages.create({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 1500,
                    messages: [
                        {
                            role: 'user',
                            content: `${prompt}\n\nRespond ONLY with valid JSON. No prose, no markdown fences.`,
                        },
                    ],
                }),
            {
                maxRetries: 2,
                baseDelayMs: 1500,
                maxDelayMs: 12000,
                onRetry: (attempt, delay, err) =>
                    this.logger.warn(`Claude retry #${attempt} in ${delay}ms — ${err.message}`),
            },
        );

        const block = message.content[0];
        if (block.type !== 'text') throw new Error('Unexpected Claude response type');
        return this.parseJson(block.text);
    }

    // ---------------------------------------------------------------------------
    // Rule-based fallback (always works, no API needed)
    // ---------------------------------------------------------------------------
    private ruleBased(data: any): any {
        const cookies: any[] = data.cookies || [];
        const scripts: any[] = data.scripts || [];

        const trackingCookies = cookies.filter(
            (c) =>
                /(_ga|_gid|fbp|_fbq|ads|track|pixel|analytics)/i.test(c.name || '') ||
                c.domain !== new URL(data.url || 'https://unknown').hostname,
        );

        const thirdPartyScripts = scripts.filter(
            (s) => s && !s.includes(new URL(data.url || 'https://unknown').hostname),
        );

        const hasPolicy = !!data.privacyPolicyText && data.privacyPolicyText.length > 200;

        // Deduct points
        let score = 100;
        score -= Math.min(trackingCookies.length * 8, 40);
        score -= Math.min(thirdPartyScripts.length * 4, 30);
        if (!hasPolicy) score -= 20;
        score = Math.max(score, 0);

        const riskLevel =
            score >= 75 ? 'LOW' : score >= 50 ? 'MEDIUM' : score >= 25 ? 'HIGH' : 'CRITICAL';

        return {
            score,
            riskLevel,
            analysis: `Rule-based analysis (AI providers temporarily unavailable). Found ${trackingCookies.length} tracking cookies and ${thirdPartyScripts.length} third-party scripts. Privacy policy ${hasPolicy ? 'detected' : 'not found'}.`,
            risks: [
                ...(trackingCookies.length > 0
                    ? [{ category: 'Tracking', description: `${trackingCookies.length} tracking cookies detected`, severity: trackingCookies.length > 5 ? 'HIGH' : 'MEDIUM' }]
                    : []),
                ...(thirdPartyScripts.length > 0
                    ? [{ category: 'Third-Party Scripts', description: `${thirdPartyScripts.length} external scripts loaded`, severity: 'MEDIUM' }]
                    : []),
                ...(!hasPolicy
                    ? [{ category: 'Compliance', description: 'No privacy policy found or too short', severity: 'HIGH' }]
                    : []),
            ],
            recommendations: [
                ...(trackingCookies.length > 0 ? ['Implement cookie consent management (GDPR compliant)'] : []),
                ...(thirdPartyScripts.length > 0 ? ['Audit all third-party script dependencies'] : []),
                ...(!hasPolicy ? ['Add a comprehensive, accessible privacy policy'] : []),
                'Re-run scan later for full AI-powered analysis',
            ],
            _provider: 'rule-based',
        };
    }

    // ---------------------------------------------------------------------------
    // Circuit breaker helpers
    // ---------------------------------------------------------------------------
    private isCircuitClosed(provider: string): boolean {
        const circuit = this.circuits[provider];
        if (!circuit) return true;
        if (!circuit.failed) return true;
        // Auto-reset after cooldown
        if (Date.now() - circuit.failedAt >= circuit.cooldownMs) {
            this.resetCircuit(provider);
            this.logger.log(`[Circuit RESET] ${provider} is available again`);
            return true;
        }
        return false;
    }

    private openCircuit(provider: string): void {
        if (this.circuits[provider]) {
            this.circuits[provider].failed = true;
            this.circuits[provider].failedAt = Date.now();
        }
    }

    private resetCircuit(provider: string): void {
        if (this.circuits[provider]) {
            this.circuits[provider].failed = false;
            this.circuits[provider].failedAt = 0;
        }
    }

    // ---------------------------------------------------------------------------
    // Provider chain builder
    // ---------------------------------------------------------------------------
    private buildProviderChain(preferred: string): string[] {
        const all = ['gemini', 'openai', 'claude'];
        const others = all.filter((p) => p !== preferred);
        return [preferred, ...others];
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------
    private parseJson(text: string | null): any {
        if (!text) throw new Error('Empty response from AI provider');
        try {
            const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(clean);
        } catch {
            this.logger.error(`Failed to parse AI JSON: ${text?.substring(0, 200)}`);
            throw new Error('Invalid JSON from AI provider');
        }
    }

    private isQuotaOrServerError(error: any): boolean {
        const msg = (error?.message || '').toLowerCase();
        const status = error?.status ?? error?.response?.status;
        return (
            status === 429 ||
            status >= 500 ||
            msg.includes('429') ||
            msg.includes('quota') ||
            msg.includes('rate limit') ||
            msg.includes('resource has been exhausted') ||
            msg.includes('overloaded') ||
            msg.includes('service unavailable')
        );
    }

    private rateLimitedResponse(waitMs: number): any {
        return {
            score: 0,
            riskLevel: 'UNAVAILABLE',
            analysis: `AI analysis is temporarily rate-limited to protect API quota. Next request allowed in ~${Math.ceil(waitMs / 1000)}s. The raw scan data (cookies, scripts, trackers) is still displayed below.`,
            risks: [],
            recommendations: ['Wait 1-2 minutes before scanning again.'],
            _rateLimited: true,
            _provider: 'none',
        };
    }
}
