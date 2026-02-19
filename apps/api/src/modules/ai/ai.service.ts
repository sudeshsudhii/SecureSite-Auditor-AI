import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    // Default fallback instances (from env)
    private defaultGenAI: GoogleGenerativeAI;
    private defaultOpenAI: OpenAI;

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

        try {
            if (provider === 'openai') {
                return await this.analyzeWithOpenAI(prompt, customApiKey);
            } else {
                return await this.analyzeWithGemini(prompt, customApiKey);
            }
        } catch (error) {
            this.logger.error(`AI Analysis failed: ${error.message}`);
            return {
                score: 0,
                riskLevel: 'ERROR',
                analysis: `Failed to analyze data with ${provider}. Error: ${error.message}`,
                error: error.message
            };
        }
    }

    private async analyzeWithGemini(prompt: string, apiKey?: string): Promise<any> {
        let genAI = this.defaultGenAI;

        // Use custom instance if key provided
        if (apiKey) {
            genAI = new GoogleGenerativeAI(apiKey);
        }

        if (!genAI) {
            throw new Error('Gemini API Key not configured.');
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return this.parseJson(text);
    }

    private async analyzeWithOpenAI(prompt: string, apiKey?: string): Promise<any> {
        let openai = this.defaultOpenAI;

        // Use custom instance if key provided
        if (apiKey) {
            openai = new OpenAI({ apiKey });
        }

        if (!openai) {
            throw new Error('OpenAI API Key not configured.');
        }

        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" }, // Ensure JSON mode if supported or prompt strictness
        });

        const text = completion.choices[0].message.content;
        return this.parseJson(text);
    }

    private parseJson(text: string): any {
        try {
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            this.logger.error(`Failed to parse AI response: ${text}`);
            throw new Error('Invalid JSON response from AI provider');
        }
    }
}
