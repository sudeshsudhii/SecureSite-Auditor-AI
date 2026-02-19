import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'], // Look in api root and monorepo root
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ScannerModule,
    AiModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
