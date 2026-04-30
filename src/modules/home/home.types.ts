import type {
  FeaturedCategory,
  FeaturedProvider,
  ScreenComponentData,
} from './dtos/home-response.dto';

export interface ResolveDataSourceParams {
  source: string;
  data: { categories: FeaturedCategory[]; providers: FeaturedProvider[] };
}
export type ResolveDataSourceResult =
  | FeaturedCategory[]
  | FeaturedProvider[]
  | Record<string, unknown>[];

export interface DefaultLayoutParams {
  categories: FeaturedCategory[];
  providers: FeaturedProvider[];
}
export type DefaultLayoutResult = ScreenComponentData[];
