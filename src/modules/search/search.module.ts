import { Module } from '@nestjs/common';

import { ScreenConfigModule } from '@modules/shared/screen/screen-config.module';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [ScreenConfigModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
