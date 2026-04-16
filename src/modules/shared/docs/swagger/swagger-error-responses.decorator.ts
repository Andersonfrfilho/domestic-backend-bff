import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { ErrorResponseDto, ValidationErrorResponseDto } from '@modules/error/dtos/errors.dto';

interface AlternativeErrorsOptions {
  badRequest?: boolean;
  unauthorized?: boolean;
  forbidden?: boolean;
  notFound?: boolean;
  conflict?: boolean;
  internalServerError?: boolean;
}

export function ApiAlternativeErrorResponses(
  options: AlternativeErrorsOptions = {},
): MethodDecorator & ClassDecorator {
  const {
    badRequest = false,
    unauthorized = false,
    forbidden = false,
    notFound = false,
    conflict = false,
    internalServerError = true,
  } = options;

  const decorators: Array<MethodDecorator | ClassDecorator> = [
    ApiExtraModels(ErrorResponseDto, ValidationErrorResponseDto),
  ];

  if (badRequest) {
    decorators.push(
      ApiBadRequestResponse({
        description: 'Parâmetros/body inválidos',
        schema: { $ref: getSchemaPath(ValidationErrorResponseDto) },
      }),
    );
  }

  if (unauthorized) {
    decorators.push(
      ApiUnauthorizedResponse({
        description: 'Usuário não autenticado',
        schema: { $ref: getSchemaPath(ErrorResponseDto) },
      }),
    );
  }

  if (forbidden) {
    decorators.push(
      ApiForbiddenResponse({
        description: 'Usuário sem permissão para este recurso',
        schema: { $ref: getSchemaPath(ErrorResponseDto) },
      }),
    );
  }

  if (notFound) {
    decorators.push(
      ApiNotFoundResponse({
        description: 'Recurso não encontrado',
        schema: { $ref: getSchemaPath(ErrorResponseDto) },
      }),
    );
  }

  if (conflict) {
    decorators.push(
      ApiConflictResponse({
        description: 'Conflito de estado do recurso',
        schema: { $ref: getSchemaPath(ErrorResponseDto) },
      }),
    );
  }

  if (internalServerError) {
    decorators.push(
      ApiInternalServerErrorResponse({
        description: 'Erro interno inesperado',
        schema: { $ref: getSchemaPath(ErrorResponseDto) },
      }),
    );
  }

  return applyDecorators(...decorators);
}
