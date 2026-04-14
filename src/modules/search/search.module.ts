import { Module } from '@nestjs/common';

import { ScreenConfigModule } from '@modules/shared/screen/screen-config.module';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SEARCH_SERVICE } from './search.token';

@Module({
  imports: [ScreenConfigModule],
  controllers: [SearchController],
  providers: [
    {
      provide: SEARCH_SERVICE,
      useClass: SearchService,
    },
  ],
  exports: [SEARCH_SERVICE],
})
export class SearchModule {}
