import type { ScreenComponent, ScreenConfig } from './schemas/screen-config.schema';

export interface ScreenConfigUpsertParams {
  screenId: string;
  version: string;
  components: ScreenComponent[];
}
export type ScreenConfigUpsertResult = Promise<ScreenConfig>;
