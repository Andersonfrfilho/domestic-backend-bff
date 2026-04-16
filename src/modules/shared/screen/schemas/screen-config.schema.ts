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

/** Tipo de ação ao tocar no componente (padrão SDUI Airbnb/Netflix) */
export type ComponentActionType = 'navigate' | 'open_modal' | 'external_link' | 'none';

/**
 * Ação executada ao tocar em um componente ou item de lista.
 * `route` suporta templates com parâmetros do item: `/providers/{id}`
 */
export interface ComponentAction {
  type: ComponentActionType;
  /** Rota interna do app (navigate / open_modal). Suporta `{field}` do item de dados. */
  route?: string;
  /** URL externa (external_link). */
  url?: string;
  /** Parâmetros extras a injetar na rota além dos do item de dados. */
  params?: Record<string, string>;
}

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

  /**
   * Ação ao tocar no componente (ou em itens da lista do componente).
   * null = componente não é interativo.
   */
  @Prop({ type: Object, default: null })
  action: ComponentAction | null;
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
