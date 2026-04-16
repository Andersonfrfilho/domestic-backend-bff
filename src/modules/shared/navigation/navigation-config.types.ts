import type { Navigation } from './interfaces/navigation.interface';

export interface NavigationConfigUpsertParams {
  screenId: string;
  navigation: Navigation;
}
export type NavigationConfigUpsertResult = Promise<Navigation>;
