import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { LOGGER_PROVIDER } from '@adatechnology/logger';
import type { LogProviderInterface } from '@modules/shared/interfaces/log.interface';
import { BffCacheService } from '@modules/shared/cache/bff-cache.service';
import { BFF_CACHE_SERVICE } from '@modules/shared/cache/bff-cache.token';
import { CACHE_KEYS } from '@modules/shared/constants/cache-keys.constant';

import type { Navigation } from './interfaces/navigation.interface';
import type {
  NavigationConfigUpsertParams,
  NavigationConfigUpsertResult,
} from './navigation-config.types';
import {
  NavigationConfig,
  NavigationConfigDocument,
  TabBarItemDoc,
} from './schemas/navigation-config.schema';

const CACHE_TTL = 300; // 5min

export const DEFAULT_NAVIGATION: Navigation = {
  tabBar: {
    visible: true,
    items: [
      { id: 'home', label: 'Início', icon: 'home', route: '/home', visible: true },
      { id: 'search', label: 'Buscar', icon: 'search', route: '/search', visible: true },
      { id: 'dashboard', label: 'Pedidos', icon: 'list', route: '/dashboard', visible: true },
      { id: 'chat', label: 'Chat', icon: 'chat', route: '/chat', visible: true },
      {
        id: 'notifications',
        label: 'Avisos',
        icon: 'bell',
        route: '/notifications',
        visible: true,
      },
    ],
  },
  header: {
    title: null,
    showBack: false,
    actions: [],
  },
};

@Injectable()
export class NavigationConfigService {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logProvider: LogProviderInterface,
    @InjectModel(NavigationConfig.name)
    private readonly model: Model<NavigationConfigDocument>,
    @Inject(BFF_CACHE_SERVICE)
    private readonly cache: BffCacheService,
  ) {}

  async getNavigation(screenId = 'default'): Promise<Navigation> {
    const cacheKey = CACHE_KEYS.NAVIGATION(screenId);
    const cached = await this.cache.get<Navigation>(cacheKey);
    if (cached) return cached;

    let config: NavigationConfig | null;
    try {
      config = await this.model.findOne({ screen_id: screenId, is_active: true }).lean().exec();
    } catch (err) {
      this.logProvider.warn({
        message: `Failed to get navigation config for ${screenId}: ${err instanceof Error ? err.message : err}`,
        context: 'NavigationConfigService.getNavigation',
      });
      config = null;
    }

    if (!config) {
      if (screenId !== 'default') {
        return this.getNavigation('default');
      }
      return DEFAULT_NAVIGATION;
    }

    const navigation = this.toNavigation(config);
    await this.cache.set({ key: cacheKey, value: navigation, ttlSeconds: CACHE_TTL });
    return navigation;
  }

  async listAll(): Promise<NavigationConfig[]> {
    return this.model.find({}).lean().exec();
  }

  async findOne(screenId: string): Promise<NavigationConfig | null> {
    return this.model.findOne({ screen_id: screenId, is_active: true }).lean().exec();
  }

  async deactivate(screenId: string): Promise<void> {
    await this.model.updateOne({ screen_id: screenId }, { is_active: false });
    // Invalida nav específica e o app-config que a agrega
    await Promise.all([
      this.cache.del(CACHE_KEYS.NAVIGATION(screenId)),
      this.cache.del(CACHE_KEYS.APP_CONFIG),
    ]);
    this.logProvider.info({
      message: `Navigation config deactivated: ${screenId}`,
      context: 'NavigationConfigService.deactivate',
    });
  }

  async upsert({
    screenId,
    navigation,
  }: NavigationConfigUpsertParams): NavigationConfigUpsertResult {
    await this.model.findOneAndUpdate(
      { screen_id: screenId },
      {
        screen_id: screenId,
        is_active: true,
        tab_bar: {
          visible: navigation.tabBar.visible,
          items: navigation.tabBar.items.map((item) => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
            route: item.route,
            visible: item.visible,
            badge: item.badge ?? null,
          })),
        },
        header: {
          title: navigation.header.title ?? null,
          show_back: navigation.header.showBack,
          actions: navigation.header.actions,
        },
      },
      { upsert: true, new: true },
    );

    // Invalida nav específica e o app-config que a agrega
    await Promise.all([
      this.cache.del(CACHE_KEYS.NAVIGATION(screenId)),
      this.cache.del(CACHE_KEYS.APP_CONFIG),
    ]);
    this.logProvider.info({
      message: `Navigation config upserted: ${screenId}`,
      context: 'NavigationConfigService.upsert',
    });
    return navigation;
  }

  private toNavigation(config: NavigationConfig): Navigation {
    return {
      tabBar: {
        visible: config.tab_bar?.visible ?? true,
        items: (config.tab_bar?.items ?? []).map(
          (item): TabBarItemDoc => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
            route: item.route,
            visible: item.visible,
            badge: item.badge ?? null,
          }),
        ),
      },
      header: {
        title: config.header?.title ?? null,
        showBack: config.header?.show_back ?? false,
        actions: (config.header?.actions ?? []).map((a) => ({
          id: a.id,
          icon: a.icon,
          action: a.action,
        })),
      },
    };
  }
}
