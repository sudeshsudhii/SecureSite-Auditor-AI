declare module 'robots-parser' {
    interface Robot {
        isAllowed(url: string, userAgent?: string): boolean;
        isDisallowed(url: string, userAgent?: string): boolean;
        getMatchingLineNumber(url: string, userAgent?: string): number;
        getCrawlDelay(userAgent?: string): number;
        getSitemaps(): string[];
        getPreferredHost(): string;
    }

    function robotsParser(url: string, robotsTxtContent: string): Robot;
    export = robotsParser;
}

declare module 'puppeteer-extra';
declare module 'puppeteer-extra-plugin-stealth';
