import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Prisma error codes we want to handle gracefully
const PRISMA_UNIQUE_VIOLATION = 'P2002'; // Unique constraint
const PRISMA_NOT_FOUND = 'P2025';        // Record not found
const PRISMA_CONN_FAILED = ['P1001', 'P1002', 'P1008', 'P1017']; // DB unreachable

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      // Standard NestJS HTTP exceptions (400, 401, 403, 404, 409…)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exceptionResponse;
    } else if (exception && typeof exception === 'object' && 'code' in exception) {
      // Prisma / database errors
      const code = (exception as any).code as string;

      if (code === PRISMA_UNIQUE_VIOLATION) {
        status = HttpStatus.CONFLICT;
        const field = (exception as any).meta?.target?.[0] ?? 'field';
        message = `An account with this ${field} already exists.`;
      } else if (code === PRISMA_NOT_FOUND) {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found.';
      } else if (PRISMA_CONN_FAILED.includes(code)) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'Database is temporarily unavailable. Please try again shortly.';
      } else {
        message = `Database error (${code}). Please try again.`;
      }
    }

    // Always log the full error for debugging on the server
    if (exception instanceof Error) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${JSON.stringify(exception)}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
