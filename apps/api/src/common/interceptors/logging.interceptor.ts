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

        return next.handle().pipe(
            tap(() => {
                // In production log only slow requests (>1s) — in dev log everything
                const elapsed = Date.now() - now;
                if (!isProd || elapsed > 1000) {
                    console.log(
                        JSON.stringify({
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
