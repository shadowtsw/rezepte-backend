import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Request, Response } from "express";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request: Request = context.switchToHttp().getRequest();

    const { method, originalUrl } = request;

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response: Response = context.switchToHttp().getResponse();
          const duration = Date.now() - start;

          this.logger.log(
            `${method} ${originalUrl} ${response.statusCode} - ${duration}ms`,
          );
        },

        error: (error: unknown) => {
          const duration = Date.now() - start;
          const status =
            error instanceof HttpException ? error.getStatus() : 500;

          this.logger.error(
            `${method} ${originalUrl} ${status} - ${duration}ms`,
          );
        },
      }),
    );
  }
}
