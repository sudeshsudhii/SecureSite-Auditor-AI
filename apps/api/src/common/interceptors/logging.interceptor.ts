import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const { method, url } = request;
        const now = Date.now();
        const isProd = process.env.NODE_ENV === 'production';

        // Attach a short unique request ID for cross-layer tracing
        const requestId = Math.random().toString(36).substring(2, 9);
        request['id'] = requestId;

        return next.handle().pipe(
            tap(() => {
                const elapsed = Date.now() - now;
                // In production: only log slow requests (>1s) or errors
                // In dev: log everything
                if (!isProd || elapsed > 1000 || response.statusCode >= 400) {
                    console.log(
                        JSON.stringify({
                            id: requestId,
                            method,
                            url,
                            status: response.statusCode,
                            time: `${elapsed}ms`,
                        }),
                    );
                }
            }),
            catchError((err) => {
                // Always log errors regardless of env
                console.error(
                    JSON.stringify({
                        id: requestId,
                        url,
                        error: err.message,
                        status: err.status ?? 500,
                        time: `${Date.now() - now}ms`,
                    }),
                );
                return throwError(() => err);
            }),
        );
    }
}
