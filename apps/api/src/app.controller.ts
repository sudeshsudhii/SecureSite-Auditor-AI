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
      endpoints: ['/api/scan', '/api/auth', '/api/health'],
    };
  }

  @Get('health')
  async getHealth() {
    const memUsage = process.memoryUsage();
    
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      // DB connection failed
    }

    return {
      status: 'ok',
      service: 'SecureSite Auditor API',
      api_status: 'running',
      db_status: this.prisma.isDbActive ? 'connected' : 'disconnected',
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
