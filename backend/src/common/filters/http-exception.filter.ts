import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : null;
    const payload = typeof exceptionResponse === 'object' && exceptionResponse !== null
      ? exceptionResponse as Record<string, unknown>
      : {};
    const rawMessage = payload.message ?? (typeof exceptionResponse === 'string' ? exceptionResponse : undefined);
    const message = rawMessage ?? (status === 500 ? 'Ocurrió un error interno. Intente nuevamente.' : 'No fue posible completar la operación.');

    response.status(status).json({
      statusCode: status,
      message,
      error: payload.error ?? HttpStatus[status] ?? 'Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
