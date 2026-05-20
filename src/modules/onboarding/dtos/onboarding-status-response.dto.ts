import { ApiProperty } from '@nestjs/swagger';

export type OnboardingStep = 'address' | 'verification' | 'document' | 'complete';

export class OnboardingStatusResponseDto {
  @ApiProperty({
    enum: ['address', 'verification', 'document', 'complete'],
    description: 'Próxima etapa do onboarding pendente',
    example: 'verification',
  })
  step: OnboardingStep;

  @ApiProperty({ example: true, description: 'Indica se o endereço foi cadastrado' })
  hasAddress: boolean;

  @ApiProperty({ example: false, description: 'Indica se o email foi verificado' })
  emailVerified: boolean;

  @ApiProperty({ example: false, description: 'Indica se o telefone foi verificado' })
  phoneVerified: boolean;

  @ApiProperty({ example: false, description: 'Indica se o documento foi enviado' })
  hasDocument: boolean;
}
