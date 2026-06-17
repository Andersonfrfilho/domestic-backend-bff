import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { TraceMethod } from '@app/shared/decorators/trace-method.decorator';

import type { UserType } from './dtos/service-requests.types';
import { ServiceRequestsService } from './service-requests.service';

class CreateServiceRequestDto {
  @IsUUID()
  @IsNotEmpty()
  providerId: string;

  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @IsUUID()
  @IsNotEmpty()
  addressId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceFinal?: number;

  @IsUUID()
  @IsOptional()
  paymentMethodTypeId?: string;

  @IsNumber()
  @Min(0.5)
  @IsOptional()
  estimatedHours?: number;
}

@ApiTags('Service Requests')
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly serviceRequestsService: ServiceRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar solicitação de serviço' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 201, description: 'Solicitação criada.' })
  @TraceMethod()
  async create(@Body() body: CreateServiceRequestDto) {
    return this.serviceRequestsService.create(body);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar minhas solicitações' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiHeader({ name: 'x-user-type', required: false, description: 'CUSTOMER | PROVIDER' })
  @ApiResponse({ status: 200, description: 'Lista de solicitações.' })
  @TraceMethod()
  async list(@Headers('x-user-type') userType: string) {
    const resolvedUserType: UserType =
      userType?.toUpperCase() === 'PROVIDER' ? 'PROVIDER' : 'CUSTOMER';
    return this.serviceRequestsService.list(resolvedUserType);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detalhe da solicitação' })
  @ApiResponse({ status: 200, description: 'Detalhe da solicitação.' })
  @ApiResponse({ status: 404, description: 'Não encontrado.' })
  @TraceMethod()
  async findById(@Param('id') id: string) {
    return this.serviceRequestsService.findById(id);
  }

  @Put(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prestador aceita solicitação' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Solicitação aceita.' })
  @TraceMethod()
  async accept(@Param('id') id: string) {
    return this.serviceRequestsService.accept(id);
  }

  @Put(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prestador rejeita solicitação' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Solicitação rejeitada.' })
  @TraceMethod()
  async reject(@Param('id') id: string) {
    return this.serviceRequestsService.reject(id);
  }

  @Put(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar conclusão do serviço' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Serviço concluído.' })
  @TraceMethod()
  async complete(@Param('id') id: string) {
    return this.serviceRequestsService.complete(id);
  }

  @Put(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar solicitação' })
  @ApiHeader({ name: 'authorization', required: true, description: 'Bearer token JWT' })
  @ApiResponse({ status: 200, description: 'Solicitação cancelada.' })
  @TraceMethod()
  async cancel(@Param('id') id: string) {
    return this.serviceRequestsService.cancel(id);
  }
}
