import { Module } from '@nestjs/common';

import { ApiClientModule } from '@modules/shared/api-client/api-client.module';

import { ReviewController } from './review.controller';

@Module({
  imports: [ApiClientModule],
  controllers: [ReviewController],
})
export class ReviewModule {}
