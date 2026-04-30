import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ScreenConfig, ScreenConfigDocument } from './schemas/screen-config.schema';
import type { ScreenConfigUpsertParams, ScreenConfigUpsertResult } from './screen-config.types';

@Injectable()
export class ScreenConfigService {
  private readonly logger = new Logger(ScreenConfigService.name);

  constructor(
    @InjectModel(ScreenConfig.name)
    private readonly model: Model<ScreenConfigDocument>,
  ) {}

  async getActiveScreen(screenId: string): Promise<ScreenConfig | null> {
    try {
      return this.model
        .findOne({ screen_id: screenId, is_active: true })
        .lean()
        .exec();
    } catch (err) {
      this.logger.warn(`Failed to get screen config for ${screenId}: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  async upsert({ screenId, version, components }: ScreenConfigUpsertParams): ScreenConfigUpsertResult {
    const result = await this.model.findOneAndUpdate(
      { screen_id: screenId },
      { screen_id: screenId, version, components, is_active: true },
      { upsert: true, new: true },
    ).lean().exec();

    this.logger.log(`Screen config upserted: ${screenId} v${version}`);
    return result as ScreenConfig;
  }

  async listAll(): Promise<ScreenConfig[]> {
    return this.model.find({}).lean().exec();
  }

  async deactivate(screenId: string): Promise<void> {
    await this.model.updateOne({ screen_id: screenId }, { is_active: false });
  }
}
