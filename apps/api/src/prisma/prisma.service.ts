import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private _isDbActive = false;

  async onModuleInit() {
    await this.connectWithRetry(3, 5000);
  }

  get isDbActive(): boolean {
    return this._isDbActive;
  }

  private async connectWithRetry(retries: number, delayMs: number) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.$connect();
        this._isDbActive = true;
        this.logger.log('Database connected successfully');
        return;
      } catch (error: any) {
        this.logger.error(
          `Database connection failed (Attempt ${attempt}/${retries}): ${error.message}`
        );
        if (attempt === retries) {
          this.logger.error(
            'All database connection retries failed. Application started in fallback (degraded) mode. DB operations will fail.'
          );
          this._isDbActive = false;
        } else {
          this.logger.warn(`Retrying database connection in ${delayMs / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
  }
}
