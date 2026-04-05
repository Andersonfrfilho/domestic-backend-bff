import { Module } from '@nestjs/common';

// SharedModule no BFF é apenas um placeholder para compatibilidade.
// Infraestrutura real está em: BffMongoModule, BffCacheModule, ApiClientModule.
@Module({})
export class SharedModule {}
