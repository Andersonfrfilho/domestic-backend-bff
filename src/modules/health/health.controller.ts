import { Controller, Get } from '@nestjs/common';

@Controller('bff')
export class HealthController {
  @Get('health')
  check() {
    return { status: true };
  }
}
