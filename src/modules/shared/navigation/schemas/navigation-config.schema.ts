import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NavigationConfigDocument = NavigationConfig & Document;

export interface TabBarItemDoc {
  id: string;
  label: string;
  icon: string;
  route: string;
  visible: boolean;
  badge: number | null;
}

export interface TabBarDoc {
  visible: boolean;
  items: TabBarItemDoc[];
}

export interface HeaderActionDoc {
  id: string;
  icon: string;
  action: string;
}

export interface NavigationHeaderDoc {
  title: string | null;
  show_back: boolean;
  actions: HeaderActionDoc[];
}

@Schema({ collection: 'navigation_configs', timestamps: true })
export class NavigationConfig {
  @Prop({ required: true, unique: true, index: true })
  screen_id: string; // 'default' | screen-specific

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ type: Object, default: {} })
  tab_bar: TabBarDoc;

  @Prop({ type: Object, default: {} })
  header: NavigationHeaderDoc;
}

export const NavigationConfigSchema = SchemaFactory.createForClass(NavigationConfig);
