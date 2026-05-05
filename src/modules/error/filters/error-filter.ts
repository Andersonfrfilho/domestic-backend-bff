import { LOGGER_PROVIDER } from '@adatechnology/logger';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

import { AppError } from '@modules/error';
import { APP_ERROR_TYPE } from '@modules/error/filters/error-filter.constant';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';

const EXCLUDED_LOG_PATHS = ['/health', '/metrics', '/docs'];

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER_PROVIDER) private readonly logProvider: LogProviderInterface) {}

  logResponse(
    exception: AppError | HttpException | Error,
    request: FastifyRequest,
    responseBody?: Record<string, unknown>,
  ) {
    try {
      const rawRequestId = request.headers['x-request-id'];
      const headerRequestId = (Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId) ?? '';
      const exceptionMessage = exception instanceof Error ? exception.message : String(exception);

      this.logProvider.error({
        message: `Exception caught in filter: ${exceptionMessage}`,
        context: 'HttpExceptionFilter.logResponse',
        requestId: headerRequestId,
        params: {
          request: {
            path: request.url,
            method: request.method,
            headers: request.headers,
            params: request.params,
            query: request.query,
            body: request.body,
          },
          response: {
            status: responseBody?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
            headers: { 'x-request-id': headerRequestId },
            messages: [exceptionMessage],
          },
          error: {
            type: exception instanceof AppError ? exception.type : 'Error',
            message: exceptionMessage,
            status: responseBody?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
            body: responseBody,
            details: exception instanceof AppError ? exception.details : undefined,
          },
        },
      });
    } catch (logError) {
      console.error('[HttpExceptionFilter] Logger failed:', String(logError));
    }
  }

  private getRequestId(request: FastifyRequest): string {
    const requestIdFromRequest = (request as any).requestId;
    if (requestIdFromRequest) {
      return requestIdFromRequest;
    }

    try {
      const loggerLib: any = require('@adatechnology/logger');
      const contextStore = loggerLib?.requestContext?.getStore?.();
      if (contextStore?.requestId) {
        return contextStore.requestId;
      }
    } catch {
      // ignore
    }

    const rawRequestId = request.headers['x-request-id'];
    return (Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId) ?? '';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    if (!response?.raw) {
      return;
    }

    const requestId = this.getRequestId(request);
    response.header('x-request-id', requestId);

    const isExcludedPath = EXCLUDED_LOG_PATHS.some((path) => request.url.startsWith(path));

    let details: unknown;

    try {
      if (exception instanceof AppError) {
        const status = exception.statusCode;
        const message = exception.message;

        if ((exception.type as string) === APP_ERROR_TYPE.VALIDATION) {
          details = exception.details;
        }

        const responseBody = this.buildErrorPayload({
          status,
          message,
          code: exception.code || 'UNKNOWN_ERROR',
          type: exception.type,
          path: request.url,
          details,
          requestId,
        });

        if (!isExcludedPath) {
          this.logResponse(exception, request, responseBody);
        }
        response.status(status).send(responseBody);
        return;
      }

      this.handleNonAppError(exception, request, response, requestId, isExcludedPath);
    } catch (sendError) {
      this.handleFilterError(sendError);
    }
  }

  private handleNonAppError(exception: unknown, request: FastifyRequest, response: FastifyReply, requestId: string, isExcludedPath = false) {
    const status = this.getStatus(exception);
    const message = this.getMessage(exception);
    let code = 'INTERNAL_ERROR';
    let type = 'INTERNAL_SERVER';
    let details: unknown;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        if (res.code) code = res.code as string;
        if (res.type) type = res.type as string;
        if (res.details) details = res.details;
      }
    }

    const errorResponseBody = this.buildErrorPayload({
      status,
      message,
      code,
      type,
      path: request.url,
      details,
      requestId,
    });

    if (!isExcludedPath) {
      this.logResponse(exception as Error, request, errorResponseBody);
    }
    response.status(status).send(errorResponseBody);
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      return typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as Record<string, unknown>).message as string | undefined) || 'Error';
    }
    if (exception instanceof Error) {
      return exception.message || 'Internal server error';
    }
    return 'Internal server error';
  }

  private buildErrorPayload({
    status,
    message,
    code,
    type,
    path,
    details,
    requestId,
  }: {
    status: number;
    message: string;
    code: string;
    type: string;
    path: string;
    details?: unknown;
    requestId?: string;
  }): Record<string, unknown> {
    const titles: Record<string, string> = {
      VALIDATION: 'Dados inválidos',
      AUTHENTICATION: 'Acesso negado',
      AUTHORIZATION: 'Permissão insuficiente',
      NOT_FOUND: 'Não encontrado',
      CONFLICT: 'Conflito detectado',
      BUSINESS_LOGIC: 'Operação não permitida',
      INTERNAL_SERVER: 'Erro interno',
    };

    const descriptions: Record<string, string> = {
      VALIDATION: 'Alguns campos estão incorretos ou incompletos. Verifique e tente novamente.',
      AUTHENTICATION: 'Sua sessão expirou ou as credenciais estão incorretas. Faça login novamente.',
      AUTHORIZATION: 'Você não tem permissão para realizar esta ação.',
      NOT_FOUND: 'O recurso solicitado não foi encontrado.',
      CONFLICT: 'Já existe um registro com estas informações.',
      BUSINESS_LOGIC: 'Não foi possível completar esta operação no momento.',
      INTERNAL_SERVER: 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
    };

    const actions: Record<string, string> = {
      VALIDATION: 'Corrija os campos destacados e tente novamente.',
      AUTHENTICATION: 'Faça login novamente ou recupere sua senha.',
      AUTHORIZATION: 'Entre em contato com o suporte se precisar de acesso.',
      NOT_FOUND: 'Verifique se o endereço está correto ou volte ao início.',
      CONFLICT: 'Verifique os dados ou use a opção de recuperação.',
      BUSINESS_LOGIC: 'Tente novamente em alguns instantes.',
      INTERNAL_SERVER: 'Atualize a página ou tente novamente mais tarde.',
    };

    const severities: Record<string, string> = {
      VALIDATION: 'warning',
      AUTHENTICATION: 'error',
      AUTHORIZATION: 'error',
      NOT_FOUND: 'warning',
      CONFLICT: 'warning',
      BUSINESS_LOGIC: 'warning',
      INTERNAL_SERVER: 'critical',
    };

    const uiComponents: Record<string, string> = {
      VALIDATION: 'form_error',
      AUTHENTICATION: 'auth_modal',
      AUTHORIZATION: 'modal',
      NOT_FOUND: 'modal',
      CONFLICT: 'modal',
      BUSINESS_LOGIC: 'toast',
      INTERNAL_SERVER: 'fullscreen_error',
    };

    const retryableTypes = ['INTERNAL_SERVER', 'BUSINESS_LOGIC'];

    const payload: Record<string, unknown> = {
      status,
      code,
      type,
      message,
      title: titles[type] || 'Erro',
      description: descriptions[type] || message,
      action: actions[type] || 'Tente novamente ou entre em contato com o suporte.',
      severity: severities[type] || 'error',
      ui_component: uiComponents[type] || 'modal',
      retryable: retryableTypes.includes(type),
      request_id: requestId || '',
      timestamp: new Date().toISOString(),
      path,
    };

    if (details) {
      payload.details = details;
    }

    return payload;
  }

  private handleFilterError(sendError: unknown) {
    try {
      this.logProvider.error({
        message: 'Failed to send error response',
        context: 'HttpExceptionFilter.handleFilterError',
      });
    } catch (logError) {
      console.error(
        '[HttpExceptionFilter] Failed to send response:',
        String(sendError),
        'Logging error:',
        String(logError),
      );
    }
  }
}
