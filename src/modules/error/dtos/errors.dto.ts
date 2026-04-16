import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: HttpStatus.INTERNAL_SERVER_ERROR,
    default: HttpStatus.INTERNAL_SERVER_ERROR,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2025-11-01T17:16:42.226Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Path of the request that caused the error',
    example: '/v1/auth/login-session',
  })
  path: string;

  @ApiProperty({
    description: 'Readable error message',
    example: 'Internal server error',
  })
  message: string;

  @ApiProperty({
    description: 'Internal mapped code (optional)',
    example: 'ERR_INTERNAL',
    required: false,
  })
  code?: string;
}

export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Details of the validation errors',
    example: [
      {
        field: 'email',
        errors: ['email must be an email'],
      },
    ],
  })
  details: Record<string, unknown>[];
}

/**
 * Backward-compatible aliases for previous names used in the codebase.
 */
export class InternalServerErrorDto extends ErrorResponseDto {}

export class BadRequestErrorValidationRequestDto extends ValidationErrorResponseDto {}
