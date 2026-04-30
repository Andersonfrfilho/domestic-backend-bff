import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'ID do usuário criado no Keycloak',
  })
  keycloakId: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'E-mail do usuário registrado',
  })
  email: string;

  @ApiProperty({
    example: true,
    description: 'Indica se o registro foi concluído com sucesso',
  })
  success: boolean;

  @ApiProperty({
    example: 'Usuário criado com sucesso',
    description: 'Mensagem de resultado do registro',
  })
  message: string;
}
