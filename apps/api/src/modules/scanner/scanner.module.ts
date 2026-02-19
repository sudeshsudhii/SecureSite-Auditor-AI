import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { ScannerController } from './scanner.controller';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [AiModule],
    providers: [ScannerService],
    controllers: [ScannerController],
    exports: [ScannerService],
})
export class ScannerModule { }
