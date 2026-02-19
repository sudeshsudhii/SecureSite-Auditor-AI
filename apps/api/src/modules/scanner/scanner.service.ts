import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException } from '@nestjs/common';
// @ts-ignore
import puppeteer from 'puppeteer-extra';
// @ts-ignore
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
// @ts-ignore
import robotsParser from 'robots-parser';
import { AiService } from '../ai/ai.service';
import { Browser, Page } from 'puppeteer';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
@Injectable()
export class ScannerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ScannerService.name);
    private browser: Browser;

    constructor(
        private aiService: AiService,
        private prisma: PrismaService
    ) {
        puppeteer.use(StealthPlugin());
    }

    async onModuleInit() {
        this.logger.log('Launching persistent browser instance...');
        try {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            });
        } catch (e) {
            this.logger.error('Failed to launch browser instance', e);
        }
    }

    async onModuleDestroy() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async getStats() {
        const totalScans = await this.prisma.scan.count();
        const highRiskScans = await this.prisma.scan.count({
            where: {
                riskLevel: {
                    in: ['HIGH', 'CRITICAL']
                }
            }
        });

        // Mocking protected users for now as we don't have user tracking fully live
        // or we could count unique URLs scanned?
        const uniqueSites = await this.prisma.scan.groupBy({
            by: ['url'],
        });

        return {
            totalScans,
            highRiskScans,
            protectedUsers: uniqueSites.length || 0
        };
    }

    async scan(url: string, config?: { provider: string, apiKey?: string }) {
        this.logger.log(`Starting scan for: ${url}`);

        // Create initial scan record
        const scanRecord = await this.prisma.scan.create({
            data: {
                url,
                status: 'PENDING',
                aiProvider: config?.provider || 'gemini'
            }
        });

        // 1. Check Robots.txt
        const isAllowed = await this.checkRobotsTxt(url);
        if (!isAllowed) {
            await this.prisma.scan.update({
                where: { id: scanRecord.id },
                data: { status: 'FAILED', report: 'Blocked by robots.txt' }
            });
            throw new BadRequestException('Scanning strictly forbidden by robots.txt');
        }

        if (!this.browser) {
            await this.onModuleInit(); // Try to restart if crashed
        }

        let page: Page | undefined;
        try {
            page = await this.browser.newPage();

            // Set legitimate-looking but identifiable User Agent
            await page.setUserAgent('PrivacyCheckBot/1.0 (+http://localhost:5173/bot-info) Mozilla/5.0 Compatible');

            // Navigate to URL
            const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
            const content = await page.content();
            const $ = cheerio.load(content);

            let cookies: any[] = [];
            try {
                const client = await page.createCDPSession();
                const result = await client.send('Network.getAllCookies');
                cookies = result.cookies;
            } catch (e) {
                this.logger.warn(`Failed to extract cookies: ${e.message}`);
            }

            const scripts = $('script').map((i, el) => $(el).attr('src')).get().filter(src => src);

            const metadata = {
                title: $('title').text(),
                description: $('meta[name="description"]').attr('content'),
                generator: $('meta[name="generator"]').attr('content'),
            };

            // Extract privacy policy
            let privacyPolicyText = '';
            const policyLink = $('a').map((i, el) => ({
                href: $(el).attr('href'),
                text: $(el).text().trim(),
            })).get().find(l =>
                l.text.toLowerCase().includes('privacy') ||
                l.href?.toLowerCase().includes('privacy')
            );

            if (policyLink && policyLink.href) {
                try {
                    const policyUrl = new URL(policyLink.href, url).href;
                    // Use a separate lightweight tab for the policy to avoid polluting main context
                    const policyPage = await this.browser.newPage();
                    await policyPage.goto(policyUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                    const policyContent = await policyPage.content();
                    const $policy = cheerio.load(policyContent);
                    privacyPolicyText = $policy('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000);
                    await policyPage.close();
                } catch (e) {
                    this.logger.warn(`Failed to fetch privacy policy: ${e.message}`);
                }
            }

            await page.close();

            const scanData = {
                url,
                cookies,
                scripts,
                privacyPolicyText,
                metadata
            };

            // AI Analysis
            const aiAnalysis = await this.aiService.analyzePrivacy(scanData, config);

            // Update scan record with results
            await this.prisma.scan.update({
                where: { id: scanRecord.id },
                data: {
                    status: 'COMPLETED',
                    score: aiAnalysis.score,
                    riskLevel: aiAnalysis.riskLevel,
                    report: JSON.stringify(aiAnalysis), // Save full analysis
                    completedAt: new Date()
                }
            });

            return {
                ...scanData,
                aiAnalysis,
                provider: config?.provider // Echo back provider for verification
            };

        } catch (error) {
            this.logger.error(`Scan failed: ${error.message}`);
            if (page) await page.close().catch(() => { });

            await this.prisma.scan.update({
                where: { id: scanRecord.id },
                data: { status: 'FAILED', report: error.message }
            });

            throw error;
        }
    }

    private async checkRobotsTxt(targetUrl: string): Promise<boolean> {
        try {
            const urlObj = new URL(targetUrl);
            const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

            this.logger.log(`Checking robots.txt at ${robotsUrl}`);
            const { data } = await axios.get(robotsUrl, { timeout: 5000, validateStatus: () => true });

            if (typeof data !== 'string') return true; // No valid robots.txt found, assume allowed

            const robots = robotsParser(robotsUrl, data);
            return robots.isAllowed(targetUrl, 'PrivacyCheckBot/1.0') ?? true;
        } catch (e) {
            this.logger.warn(`Could not check robots.txt: ${e.message}. Proceeding with caution.`);
            return true; // Fail open but log warning
        }
    }
}
