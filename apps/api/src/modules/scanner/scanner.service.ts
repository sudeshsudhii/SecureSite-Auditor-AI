import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as cheerio from 'cheerio';
import axios, { AxiosResponse } from 'axios';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../../prisma/prisma.service';

// Known tracker/analytics script patterns
const TRACKER_PATTERNS = [
  { pattern: /google-analytics\.com|googletagmanager\.com|gtag/i, name: 'Google Analytics' },
  { pattern: /facebook\.net|fbevents|connect\.facebook/i, name: 'Facebook Pixel' },
  { pattern: /hotjar\.com/i, name: 'Hotjar' },
  { pattern: /clarity\.ms/i, name: 'Microsoft Clarity' },
  { pattern: /doubleclick\.net/i, name: 'Google DoubleClick' },
  { pattern: /segment\.com|segment\.io/i, name: 'Segment' },
  { pattern: /mixpanel\.com/i, name: 'Mixpanel' },
  { pattern: /amplitude\.com/i, name: 'Amplitude' },
  { pattern: /tiktok\.com\/i18n\/pixel/i, name: 'TikTok Pixel' },
  { pattern: /snap\.licdn\.com|linkedin\.com\/px/i, name: 'LinkedIn Insight' },
  { pattern: /twitter\.com\/i\/adsct|t\.co\/i\/adsct/i, name: 'Twitter Ads' },
  { pattern: /adsbygoogle|pagead2\.googlesyndication/i, name: 'Google Ads' },
  { pattern: /pinterest\.com\/ct/i, name: 'Pinterest Tag' },
  { pattern: /bat\.bing\.com/i, name: 'Bing UET' },
  { pattern: /intercom\.io/i, name: 'Intercom' },
  { pattern: /crisp\.chat/i, name: 'Crisp Chat' },
  { pattern: /cdn\.cookielaw\.org|onetrust/i, name: 'OneTrust (Cookie Consent)' },
  { pattern: /cookiebot/i, name: 'Cookiebot' },
];

// Safe axios config for fetching pages
const AXIOS_CONFIG = {
  timeout: 10000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
  },
  maxRedirects: 5,
  validateStatus: () => true, // never throw on HTTP status codes
};

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);

  constructor(
    private aiService: AiService,
    private prisma: PrismaService,
  ) {}

  // ─── Stats ───────────────────────────────────────────────
  async getStats() {
    try {
      if (!this.prisma.isDbActive) {
        return { totalScans: 0, highRiskScans: 0, protectedUsers: 0 };
      }

      const totalScans = await this.prisma.scan.count();
      const highRiskScans = await this.prisma.scan.count({
        where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } },
      });
      const uniqueSites = await this.prisma.scan.groupBy({ by: ['url'] });

      return {
        totalScans,
        highRiskScans,
        protectedUsers: uniqueSites.length || 0,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch stats: ${error.message}`);
      return { totalScans: 0, highRiskScans: 0, protectedUsers: 0 };
    }
  }

  // ─── Main Scan ───────────────────────────────────────────
  async scan(url: string, config?: { provider: string; apiKey?: string }) {
    this.logger.log(`Starting scan for: ${url}`);

    // ── 1. Create DB record (if DB is up) ──
    let scanRecordId: string | null = null;
    if (this.prisma.isDbActive) {
      try {
        const record = await this.prisma.scan.create({
          data: {
            url,
            status: 'PENDING',
            aiProvider: config?.provider || 'gemini',
          },
        });
        scanRecordId = record.id;
      } catch (dbErr: any) {
        this.logger.warn(`DB write failed (non-fatal): ${dbErr.message}`);
      }
    }

    try {
      // ── 2. Fetch the page via HTTP ──
      const response = await this.fetchPage(url);
      const html = response.data as string;
      const responseHeaders = response.headers;
      const $ = cheerio.load(html);

      // ── 3. Extract cookies from Set-Cookie header ──
      const cookies = this.extractCookies(responseHeaders);

      // ── 4. Extract all script sources ──
      const scripts = $('script')
        .map((_i, el) => $(el).attr('src'))
        .get()
        .filter((src): src is string => !!src);

      // ── 5. Detect known trackers ──
      const detectedTrackers = this.detectTrackers($, scripts);

      // ── 6. Extract page metadata ──
      const metadata = {
        title: $('title').text().trim() || 'No title',
        description: $('meta[name="description"]').attr('content') || '',
        generator: $('meta[name="generator"]').attr('content') || '',
      };

      // ── 7. Extract security headers ──
      const securityHeaders = this.extractSecurityHeaders(responseHeaders);

      // ── 8. Attempt to find and fetch privacy policy ──
      let privacyPolicyText = '';
      const policyLink = $('a')
        .map((_i, el) => ({
          href: $(el).attr('href'),
          text: $(el).text().trim(),
        }))
        .get()
        .find(
          (l) =>
            l.text.toLowerCase().includes('privacy') ||
            l.href?.toLowerCase().includes('privacy'),
        );

      if (policyLink?.href) {
        privacyPolicyText = await this.fetchPrivacyPolicy(policyLink.href, url);
      }

      // ── 9. Build scan data payload ──
      const scanData = {
        url,
        cookies,
        scripts,
        detectedTrackers,
        securityHeaders,
        privacyPolicyText,
        metadata,
        httpStatus: response.status,
      };

      // ── 10. AI Analysis (with fallback + backend timeout guard) ──
      let aiAnalysis: any = null;
      const SCAN_TIMEOUT_MS = 60_000; // 60s hard backend limit

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI analysis timed out after 60s')), SCAN_TIMEOUT_MS)
        );

        aiAnalysis = await Promise.race([
          this.aiService.analyzePrivacy(scanData, config),
          timeoutPromise,
        ]);

        // If AI returned a rate-limited / unavailable response, enrich it with rule-based analysis
        if (aiAnalysis?.riskLevel === 'UNAVAILABLE' || aiAnalysis?._rateLimited || aiAnalysis?._quotaExceeded) {
          this.logger.warn('AI quota exhausted — enriching with rule-based fallback analysis');
          const fallback = this.generateFallbackAnalysis(scanData);
          aiAnalysis = {
            ...aiAnalysis,
            score: fallback.score,
            risks: fallback.risks,
            recommendations: [...(aiAnalysis.recommendations || []), ...fallback.recommendations],
            _fallback: true,
          };
        }
      } catch (aiErr: any) {
        this.logger.error(`AI analysis failed: ${aiErr.message}`);
        // Generate a basic rule-based analysis so the user always gets some result
        const fallback = this.generateFallbackAnalysis(scanData);
        aiAnalysis = {
          ...fallback,
          analysis: `AI analysis unavailable (${aiErr.message}). Showing rule-based analysis from scan data.`,
          _fallback: true,
        };
      }

      // ── 11. Update DB record ──
      if (scanRecordId && this.prisma.isDbActive) {
        try {
          await this.prisma.scan.update({
            where: { id: scanRecordId },
            data: {
              status: 'COMPLETED',
              score: aiAnalysis?.score ?? null,
              riskLevel: aiAnalysis?.riskLevel ?? null,
              report: JSON.stringify(aiAnalysis),
              completedAt: new Date(),
            },
          });
        } catch (dbErr: any) {
          this.logger.warn(`DB update failed (non-fatal): ${dbErr.message}`);
        }
      }

      return {
        status: 'success',
        data: {
          ...scanData,
          aiAnalysis,
          provider: config?.provider || 'gemini',
        },
      };
    } catch (error: any) {
      this.logger.error(`Scan failed for ${url}: ${error.message}`);

      // Mark DB record as failed
      if (scanRecordId && this.prisma.isDbActive) {
        try {
          await this.prisma.scan.update({
            where: { id: scanRecordId },
            data: { status: 'FAILED', report: error.message },
          });
        } catch (dbErr: any) {
          this.logger.warn(`DB update (failure) failed: ${dbErr.message}`);
        }
      }

      // NEVER throw 500 — return a controlled error response
      return {
        status: 'error',
        message: `Scan failed: ${error.message}`,
        fallback: true,
      };
    }
  }

  // ─── Private Helpers ─────────────────────────────────────

  private async fetchPage(url: string): Promise<AxiosResponse> {
    // Check robots.txt first (non-blocking)
    const isAllowed = await this.checkRobotsTxt(url);
    if (!isAllowed) {
      throw new BadRequestException('Scanning is forbidden by robots.txt');
    }

    const response = await axios.get(url, AXIOS_CONFIG);

    if (response.status >= 400) {
      this.logger.warn(`Page returned HTTP ${response.status} for ${url}`);
    }

    return response;
  }

  private extractCookies(headers: any): Array<{ name: string; value: string; flags: string[] }> {
    const cookies: Array<{ name: string; value: string; flags: string[] }> = [];
    try {
      const setCookieHeader = headers['set-cookie'];
      if (!setCookieHeader) return cookies;

      const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

      for (const raw of cookieArray) {
        const parts = raw.split(';').map((p: string) => p.trim());
        const [nameValue, ...flagParts] = parts;
        const eqIndex = nameValue.indexOf('=');
        if (eqIndex === -1) continue;

        cookies.push({
          name: nameValue.substring(0, eqIndex),
          value: nameValue.substring(eqIndex + 1).substring(0, 50), // truncate values
          flags: flagParts,
        });
      }
    } catch (e: any) {
      this.logger.warn(`Cookie extraction failed: ${e.message}`);
    }
    return cookies;
  }

  private detectTrackers($: any, scriptSrcs: string[]): Array<{ name: string; source: string }> {
    const found: Array<{ name: string; source: string }> = [];
    const fullHtml = $.html();

    for (const tracker of TRACKER_PATTERNS) {
      // Check script src attributes
      const matchedSrc = scriptSrcs.find((src) => tracker.pattern.test(src));
      if (matchedSrc) {
        found.push({ name: tracker.name, source: matchedSrc });
        continue;
      }

      // Check inline scripts and HTML for tracker patterns
      if (tracker.pattern.test(fullHtml)) {
        found.push({ name: tracker.name, source: 'inline/embedded' });
      }
    }

    return found;
  }

  private extractSecurityHeaders(headers: any): Record<string, string | null> {
    const securityHeaderNames = [
      'strict-transport-security',
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'referrer-policy',
      'permissions-policy',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy',
    ];

    const result: Record<string, string | null> = {};
    for (const name of securityHeaderNames) {
      result[name] = headers[name] || null;
    }
    return result;
  }

  private async fetchPrivacyPolicy(href: string, baseUrl: string): Promise<string> {
    try {
      const policyUrl = new URL(href, baseUrl).href;
      this.logger.log(`Fetching privacy policy from: ${policyUrl}`);

      const response = await axios.get(policyUrl, {
        ...AXIOS_CONFIG,
        timeout: 8000,
      });

      if (response.status >= 400 || typeof response.data !== 'string') {
        return '';
      }

      const $policy = cheerio.load(response.data);
      return $policy('body')
        .text()
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000);
    } catch (e: any) {
      this.logger.warn(`Failed to fetch privacy policy: ${e.message}`);
      return '';
    }
  }

  private async checkRobotsTxt(targetUrl: string): Promise<boolean> {
    try {
      const urlObj = new URL(targetUrl);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

      const { data } = await axios.get(robotsUrl, {
        timeout: 5000,
        validateStatus: () => true,
      });

      if (typeof data !== 'string') return true;

      // Simple robots.txt check — look for Disallow: /
      const lines = data.split('\n');
      let inOurBlock = false;
      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed.startsWith('user-agent:')) {
          const agent = trimmed.replace('user-agent:', '').trim();
          inOurBlock = agent === '*' || agent.includes('privacycheck');
        }
        if (inOurBlock && trimmed === 'disallow: /') {
          return false; // Entire site disallowed
        }
      }
      return true;
    } catch (e: any) {
      this.logger.warn(`Could not check robots.txt: ${e.message}. Proceeding.`);
      return true; // Fail open
    }
  }

  /**
   * Generates a basic rule-based privacy analysis from scan data.
   * Used as a fallback when the AI provider is unavailable (quota exceeded, errors).
   * Scores are heuristic-based and conservative.
   */
  private generateFallbackAnalysis(scanData: any): {
    score: number;
    riskLevel: string;
    analysis: string;
    risks: Array<{ category: string; description: string; severity: string }>;
    recommendations: string[];
  } {
    let score = 100;
    const risks: Array<{ category: string; description: string; severity: string }> = [];
    const recommendations: string[] = [];

    // --- Tracker penalty ---
    const trackerCount = scanData.detectedTrackers?.length || 0;
    if (trackerCount > 0) {
      const penalty = Math.min(trackerCount * 8, 40); // up to -40
      score -= penalty;
      risks.push({
        category: 'Tracking',
        description: `${trackerCount} known tracker(s) detected on this page.`,
        severity: trackerCount >= 5 ? 'HIGH' : trackerCount >= 2 ? 'MEDIUM' : 'LOW',
      });
      recommendations.push(`Review and minimize the ${trackerCount} tracking script(s) found.`);
    }

    // --- Cookie penalty ---
    const cookieCount = scanData.cookies?.length || 0;
    if (cookieCount > 5) {
      score -= Math.min((cookieCount - 5) * 3, 20);
      risks.push({
        category: 'Cookies',
        description: `${cookieCount} cookies set — users should be informed and given control.`,
        severity: cookieCount > 15 ? 'HIGH' : 'MEDIUM',
      });
      recommendations.push('Implement a cookie consent banner compliant with GDPR/CCPA.');
    }

    // --- Missing security headers ---
    const headers = scanData.securityHeaders || {};
    const missingHeaders = Object.entries(headers)
      .filter(([, val]) => !val)
      .map(([name]) => name);
    if (missingHeaders.length > 0) {
      score -= Math.min(missingHeaders.length * 5, 25);
      risks.push({
        category: 'Security Headers',
        description: `${missingHeaders.length} security header(s) missing: ${missingHeaders.slice(0, 3).join(', ')}${missingHeaders.length > 3 ? '...' : ''}.`,
        severity: missingHeaders.length >= 5 ? 'HIGH' : 'MEDIUM',
      });
      recommendations.push(`Add missing security headers (${missingHeaders.slice(0, 3).join(', ')}).`);
    }

    // --- No privacy policy ---
    if (!scanData.privacyPolicyText) {
      score -= 15;
      risks.push({
        category: 'Privacy Policy',
        description: 'No privacy policy link was detected on the page.',
        severity: 'HIGH',
      });
      recommendations.push('Add a clearly visible privacy policy link accessible from every page.');
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine risk level
    let riskLevel = 'LOW';
    if (score < 30) riskLevel = 'CRITICAL';
    else if (score < 50) riskLevel = 'HIGH';
    else if (score < 70) riskLevel = 'MEDIUM';

    return {
      score,
      riskLevel,
      analysis: `Rule-based analysis: Privacy score is ${score}/100 based on ${trackerCount} tracker(s), ${cookieCount} cookie(s), and ${missingHeaders.length} missing security header(s).`,
      risks,
      recommendations,
    };
  }
}

