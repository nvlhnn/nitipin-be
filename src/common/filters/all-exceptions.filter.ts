import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorBody: ErrorBody = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorBody = {
          code: STATUS_CODE_MAP[status] || 'INTERNAL_ERROR',
          message: exceptionResponse,
        };
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        errorBody = {
          code:
            (resp.code as string) ||
            STATUS_CODE_MAP[status] ||
            'INTERNAL_ERROR',
          message: (resp.message as string) || exception.message,
          details: resp.details || resp.message,
        };
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      errorBody = {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      };
    }

    response.status(status).json({
      success: false,
      error: errorBody,
    });
  }
}
