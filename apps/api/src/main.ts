import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { verifyDatabase } from './config/db-check';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  await verifyDatabase();
  
  const app = await NestFactory.create(AppModule);

  // Trust proxy headers (critical for correct IP detection behind Vercel/Render/Railway)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  
  // ── CORS ──────────────────────────────────────────────────
  const frontendUrl = process.env.FRONTEND_URL || '';
  const allowedOrigins: string[] = [
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  // Add the production Vercel URL if configured
  if (frontendUrl) {
    allowedOrigins.push(frontendUrl);
  }

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Check exact match or *.vercel.app pattern
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/.*\.vercel\.app$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(null, true); // Allow but log — set to callback(new Error(...)) to strictly block
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-ai-provider', 'x-api-key'],
  });

  // ── Global prefix ─────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Validation Pipe ────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Exception Filter ──────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Start ─────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`SecureSite Auditor API running on port ${port}`);
  logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  
  // Structured startup diagnostics
  console.log(JSON.stringify({
    db: process.env.DB_PROVIDER || process.env.DATABASE_URL?.startsWith('file:') ? 'sqlite' : 'postgresql',
    env: process.env.NODE_ENV || 'development',
    port,
    time: new Date().toISOString(),
  }));
}

bootstrap();
