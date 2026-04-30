import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ForgotPasswordRequestDto } from './dtos/forgot-password-request.dto';

@ApiTags('Auth')
@Controller('bff/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recuperação de senha',
    description: 'Dispara um e-mail de redefinição de senha via Keycloak.',
  })
  @ApiResponse({ status: 200, description: 'E-mail de recuperação disparado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  async forgotPassword(@Body() body: ForgotPasswordRequestDto): Promise<void> {
    await this.authService.forgotPassword(body.email);
  }
}
