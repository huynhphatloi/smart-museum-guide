import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ErrorCode, ErrorCodeValue } from '../errors/error-codes';

interface NormalisedError {
  status: number;
  code: ErrorCodeValue;
  message: string;
  details?: unknown;
}

/**
 * Single place where every thrown error becomes a predictable JSON body:
 * `{ statusCode, code, message, details?, path, timestamp }`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalised = this.normalise(exception);

    if (normalised.status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${normalised.status} ${normalised.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(normalised.status).json({
      statusCode: normalised.status,
      code: normalised.code,
      message: normalised.message,
      ...(normalised.details === undefined ? {} : { details: normalised.details }),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private normalise(exception: unknown): NormalisedError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        const code =
          typeof record.code === 'string'
            ? (record.code as ErrorCodeValue)
            : this.codeForStatus(status);
        const message = Array.isArray(record.message)
          ? 'Request validation failed.'
          : typeof record.message === 'string'
            ? record.message
            : exception.message;
        const details = Array.isArray(record.message) ? record.message : record.details;
        return { status, code, message, details };
      }

      return { status, code: this.codeForStatus(status), message: exception.message };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.normalisePrisma(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
    };
  }

  private normalisePrisma(error: Prisma.PrismaClientKnownRequestError): NormalisedError {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
        return {
          status: HttpStatus.CONFLICT,
          code: ErrorCode.UNIQUE_CONSTRAINT,
          message: `A record with this ${target} already exists.`,
        };
      }
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          code: ErrorCode.RESOURCE_IN_USE,
          message: 'This record is referenced by other records and cannot be modified.',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: ErrorCode.NOT_FOUND,
          message: 'The requested record does not exist.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Database error.',
        };
    }
  }

  private codeForStatus(status: number): ErrorCodeValue {
    if (status === HttpStatus.UNAUTHORIZED) return ErrorCode.UNAUTHORIZED;
    if (status === HttpStatus.NOT_FOUND) return ErrorCode.NOT_FOUND;
    if (status === HttpStatus.BAD_REQUEST) return ErrorCode.VALIDATION_FAILED;
    if (status === HttpStatus.CONFLICT) return ErrorCode.RESOURCE_IN_USE;
    return ErrorCode.INTERNAL_ERROR;
  }
}
