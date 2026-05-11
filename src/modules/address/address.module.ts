import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AddressController } from './address.controller';
import { AddressService } from './address.service';

@Module({
  imports: [ConfigModule],
  controllers: [AddressController],
  providers: [AddressService],
})
export class AddressModule {}
