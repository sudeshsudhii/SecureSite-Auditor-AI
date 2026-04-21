import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getRoot() {
    return {
      message: 'SecureSite Auditor API is running',
      endpoints: ['/api/scan', '/api/auth', '/health'],
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      api_status: 'running',
      db_status: this.prisma.isDbActive ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
