import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ScreenConfigDocument = ScreenConfig & Document;

export type ComponentType =
  | 'banner_carousel'
  | 'category_list'
  | 'category_grid'
  | 'provider_grid'
  | 'provider_list'
  | 'section_header'
  | 'search_bar'
  | 'search_filters'
  | 'promo_banner'
  | 'empty_state';

export type DataSource =
  | 'featured_banners'
  | 'categories'
  | 'featured_providers'
  | 'search_results'
  | 'search_filters'
  | 'static';

@Schema({ _id: false })
export class ScreenComponent {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  type: ComponentType;

  /** Qual fonte de dados preenche este componente */
  @Prop({ required: true })
  data_source: DataSource;

  /** Ordem de renderização (menor = primeiro) */
  @Prop({ default: 0 })
  order: number;

  /** Hints de renderização para o frontend (ex: { columns: 2, auto_play: true }) */
  @Prop({ type: Object, default: {} })
  config: Record<string, unknown>;

  /** Visível ou oculto no frontend */
  @Prop({ default: true })
  visible: boolean;
}

export const ScreenComponentSchema = SchemaFactory.createForClass(ScreenComponent);

@Schema({ collection: 'screen_configs', timestamps: true })
export class ScreenConfig {
  @Prop({ required: true, unique: true, index: true })
  screen_id: string; // 'home' | 'search'

  @Prop({ required: true })
  version: string;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ type: [ScreenComponentSchema], default: [] })
  components: ScreenComponent[];
}

export const ScreenConfigSchema = SchemaFactory.createForClass(ScreenConfig);
