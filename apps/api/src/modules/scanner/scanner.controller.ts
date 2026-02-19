import { Controller, Post, Body, UseGuards, BadRequestException, Headers, Get } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsUrl, IsNotEmpty } from 'class-validator';

class ScanUrlDto {
    @IsUrl()
    @IsNotEmpty()
    url: string;
}

@Controller('scan')
export class ScannerController {
    constructor(private readonly scannerService: ScannerService) { }

    @Get('stats')
    async getStats() {
        return this.scannerService.getStats();
    }

    // @UseGuards(JwtAuthGuard) // Disabled for testing ease, enable in production
    @Post()
    async scan(@Body() dto: ScanUrlDto, @Headers() headers: any) {
        if (!dto.url) {
            throw new BadRequestException('URL is required');
        }
        const config = {
            provider: headers['x-ai-provider'] || 'gemini',
            apiKey: headers['x-api-key']
        };
        return this.scannerService.scan(dto.url, config);
    }
}
