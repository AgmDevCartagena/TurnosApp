import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { httpErrorMessages } from '../utils/validation.utils';

interface ValidationErrorItem {
  field: string;
  label: string;
  messages: string[];
}

interface StructuredBody {
  message?: string | string[];
  errors?: ValidationErrorItem[];
  statusCode?: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // ── Prisma errors ────────────────────────────────────────────────────────
    const prismaMsg = this.mapPrismaError(exception);
    if (prismaMsg) {
      this.logger.error(`${request.method} ${request.url} - 400 [Prisma]`, (exception as Error).message);
      return response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: { code: 'ERR_400', message: prismaMsg, details: [] },
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // ── HttpException (includes ValidationPipe errors) ───────────────────────
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as StructuredBody | string;

      let message: string;
      let details: ValidationErrorItem[] = [];

      if (typeof body === 'string') {
        message = httpErrorMessages[status] ?? body;
      } else {
        const rawMessage = body.message;
        if (Array.isArray(rawMessage)) {
          message = httpErrorMessages[status] ?? 'La información enviada no es válida.';
          details = rawMessage.map((m) => ({ field: '', label: '', messages: [m] }));
        } else {
          message = (rawMessage as string) ?? httpErrorMessages[status] ?? 'Error desconocido.';
        }
        if (body.errors?.length) {
          details = body.errors;
        }
      }

      this.logger.warn(`${request.method} ${request.url} - ${status}: ${message}`);

      return response.status(status).json({
        success: false,
        error: { code: `ERR_${status}`, message, details },
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // ── Unhandled exceptions ─────────────────────────────────────────────────
    this.logger.error(
      `${request.method} ${request.url} - 500`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'ERR_500',
        message: 'Ocurrió un error interno. Intente nuevamente o contacte al administrador.',
        details: [],
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private mapPrismaError(exception: unknown): string | null {
    if (!exception || typeof exception !== 'object') return null;
    const name = (exception as { constructor: { name: string } }).constructor?.name ?? '';
    const code = (exception as Record<string, unknown>).code as string | undefined;

    if (name === 'PrismaClientKnownRequestError') {
      if (code === 'P2002') {
        const fields = ((exception as Record<string, unknown>).meta as Record<string, unknown>)?.target;
        if (Array.isArray(fields) && fields.includes('email')) {
          return 'Ya existe un usuario registrado con este correo electrónico.';
        }
        if (Array.isArray(fields) && fields.includes('nit')) {
          return 'Ya existe un proveedor registrado con este NIT.';
        }
        if (Array.isArray(fields) && fields.includes('username')) {
          return 'Ya existe un usuario con este nombre de usuario.';
        }
        return 'Ya existe un registro con esta información.';
      }
      if (code === 'P2003') {
        return 'El registro relacionado no existe o no está disponible.';
      }
      if (code === 'P2025') {
        return 'No se encontró el registro solicitado.';
      }
    }

    if (name === 'PrismaClientValidationError') {
      return 'Existe una inconsistencia en los datos enviados. Contacte al administrador.';
    }

    return null;
  }
}
