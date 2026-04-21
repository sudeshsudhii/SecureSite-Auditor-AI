import { Controller, Post, Body, Headers, Get, Logger } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { ScanUrlDto } from './scan.dto';

@Controller('scan')
export class ScannerController {
  private readonly logger = new Logger(ScannerController.name);

  constructor(private readonly scannerService: ScannerService) {}

  @Get('stats')
  async getStats() {
    return this.scannerService.getStats();
  }

  @Post()
  async scan(@Body() dto: ScanUrlDto, @Headers() headers: any) {
    this.logger.log(`Scan request received for URL: ${dto.url}`);

    const config = {
      provider: headers['x-ai-provider'] || 'gemini',
      apiKey: headers['x-api-key'],
    };

    return this.scannerService.scan(dto.url, config);
  }
}
